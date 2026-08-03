import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_ERROR_HEADER_NAME,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_MISMATCH,
  REFRESH_COOKIE_NAME,
  readCookie,
} from '../modules/auth/auth.cookies';
import { ApiError } from '../utils/apiError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function tokensMatch(cookieToken: string, headerToken: string): boolean {
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  return (
    cookieBuffer.length === headerBuffer.length &&
    timingSafeEqual(cookieBuffer, headerBuffer)
  );
}

export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const cookieToken = readCookie(req, CSRF_COOKIE_NAME);
  if (cookieToken) {
    // Trusted origins can bootstrap the in-memory token after a reload even
    // when the API cookie belongs to a different host.
    res.setHeader(CSRF_HEADER_NAME, cookieToken);
  }

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // CORS has already validated requests that carry Origin. Fetch Metadata
  // rejects cross-site mutations only when no validated browser origin exists.
  if (
    req.get('Sec-Fetch-Site')?.toLowerCase() === 'cross-site' &&
    !req.get('Origin')
  ) {
    next(ApiError.forbidden('Cross-site request is not allowed'));
    return;
  }

  const authorization = req.get('Authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  if (bearerToken) {
    // authenticate() gives bearer credentials precedence. Invalid bearer tokens
    // still fail authentication and cannot fall back to a stale cookie.
    next();
    return;
  }

  const hasAuthCookie = Boolean(
    readCookie(req, ACCESS_COOKIE_NAME) || readCookie(req, REFRESH_COOKIE_NAME)
  );
  if (!hasAuthCookie) {
    // Bearer-token and unauthenticated clients remain outside the browser cookie
    // CSRF contract, preserving Flutter and server-to-server compatibility.
    next();
    return;
  }

  const headerToken = req.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken) {
    next(ApiError.forbidden('CSRF token is required'));
    return;
  }
  if (!tokensMatch(cookieToken, headerToken)) {
    // The shared browser client retries only this machine-identifiable failure.
    // Authorization and business-rule 403 responses must never be replayed.
    res.setHeader(CSRF_ERROR_HEADER_NAME, CSRF_TOKEN_MISMATCH);
    next(ApiError.forbidden('Invalid CSRF token'));
    return;
  }

  next();
};
