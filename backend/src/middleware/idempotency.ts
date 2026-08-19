import { createHash } from 'crypto';
import { NextFunction, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_STATUS_HEADER = 'Idempotency-Status';
const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,200}$/;
const RECORD_TTL_MS = 24 * 60 * 60 * 1000;
const EXECUTION_LEASE_MS = 2 * 60 * 1000;

type Reconciliation = Readonly<{
  method: 'GET';
  path: string;
}>;

type IdempotencyOptions = Readonly<{
  reconciliation: (request: AuthRequest) => Reconciliation;
}>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function fingerprint(operation: string, body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify({ body: canonicalize(body), operation }))
    .digest('hex');
}

function errorResponse(
  res: Response,
  status: number,
  code: string,
  message: string,
  reconciliation: Reconciliation
) {
  return res.status(status).json({
    success: false,
    message,
    code,
    reconciliation,
  });
}

/**
 * Coordinates retry-safe mutations across API instances through PostgreSQL.
 * Missing keys remain backward compatible, but callers must not retry such a
 * request after an ambiguous network outcome.
 */
export function mutationIdempotency({ reconciliation }: IdempotencyOptions) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const key = req.header(IDEMPOTENCY_KEY_HEADER)?.trim();
    res.setHeader('Idempotency-Policy', 'key-required-for-retry');
    if (!key) {
      next();
      return;
    }
    if (!KEY_PATTERN.test(key)) {
      next(
        ApiError.badRequest(
          'Idempotency-Key must be 16-200 URL-safe characters'
        )
      );
      return;
    }
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }

    const requestPath = req.originalUrl.split('?', 1)[0] ?? req.originalUrl;
    const operation = `${req.method.toUpperCase()} ${requestPath}`;
    const requestHash = fingerprint(operation, req.body ?? null);
    const scope = `${req.user.role}:${req.user.userId}`;
    const lookup = reconciliation(req);
    const claim = await prisma.idempotencyRecord.createMany({
      data: [
        {
          scope,
          key,
          operation,
          requestHash,
          reconciliation: lookup,
          leaseExpiresAt: new Date(Date.now() + EXECUTION_LEASE_MS),
          expiresAt: new Date(Date.now() + RECORD_TTL_MS),
        },
      ],
      skipDuplicates: true,
    });
    const isNewClaim = claim.count === 1;
    const record = await prisma.idempotencyRecord.findUnique({
      where: { scope_key: { scope, key } },
    });
    if (!record) {
      next(new ApiError(503, 'Idempotency state unavailable'));
      return;
    }

    if (record.operation !== operation || record.requestHash !== requestHash) {
      res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'conflict');
      errorResponse(
        res,
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'This idempotency key was already used for a different request',
        lookup
      );
      return;
    }

    if (record.state === 'COMPLETED' && record.responseStatus !== null) {
      res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'replayed');
      res.setHeader('Idempotency-Replayed', 'true');
      res.status(record.responseStatus).json(record.responseBody);
      return;
    }

    if (record.state !== 'IN_PROGRESS') {
      res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'ambiguous');
      errorResponse(
        res,
        409,
        'IDEMPOTENCY_OUTCOME_AMBIGUOUS',
        'The original outcome is ambiguous; reconcile authoritative state before retrying',
        lookup
      );
      return;
    }

    if (!isNewClaim) {
      if (record.leaseExpiresAt.getTime() <= Date.now()) {
        await prisma.idempotencyRecord.updateMany({
          where: { id: record.id, state: 'IN_PROGRESS' },
          data: { state: 'AMBIGUOUS', completedAt: new Date() },
        });
        res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'ambiguous');
        errorResponse(
          res,
          409,
          'IDEMPOTENCY_OUTCOME_AMBIGUOUS',
          'The original request lease expired; reconcile authoritative state before retrying',
          lookup
        );
        return;
      }
      res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'in-progress');
      res.setHeader('Retry-After', '2');
      errorResponse(
        res,
        409,
        'IDEMPOTENCY_REQUEST_IN_PROGRESS',
        'A request with this idempotency key is already in progress',
        lookup
      );
      return;
    }

    res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'created');
    const originalJson = res.json.bind(res);
    let captured = false;
    res.json = ((body: unknown) => {
      if (captured) return res;
      captured = true;
      const responseStatus = res.statusCode;
      const state = responseStatus >= 500 ? 'AMBIGUOUS' : 'COMPLETED';
      const responseBody =
        state === 'AMBIGUOUS'
          ? {
              ...(body && typeof body === 'object' && !Array.isArray(body)
                ? body
                : {}),
              success: false,
              message:
                body &&
                typeof body === 'object' &&
                'message' in body &&
                typeof body.message === 'string'
                  ? body.message
                  : 'Mutation outcome is ambiguous; reconcile authoritative state before retrying',
              code: 'IDEMPOTENCY_OUTCOME_AMBIGUOUS',
              reconciliation: lookup,
            }
          : body;
      if (state === 'AMBIGUOUS') {
        res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'ambiguous');
      }
      void prisma.idempotencyRecord
        .update({
          where: { id: record.id },
          data: {
            state,
            responseStatus,
            responseBody: JSON.parse(
              JSON.stringify(responseBody)
            ) as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        })
        .then(() => originalJson(responseBody))
        .catch((error: unknown) => {
          logger.error('Failed to persist idempotency outcome', {
            error: error instanceof Error ? error.message : String(error),
            operation,
          });
          res.setHeader(IDEMPOTENCY_STATUS_HEADER, 'ambiguous');
          res.status(503);
          originalJson({
            success: false,
            message:
              'Mutation outcome is ambiguous; reconcile authoritative state before retrying',
            code: 'IDEMPOTENCY_PERSISTENCE_FAILED',
            reconciliation: lookup,
          });
        });
      return res;
    }) as Response['json'];

    next();
  };
}
