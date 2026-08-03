import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { logger } from './logger';

const LEGACY_BLACKLIST_PREFIX = 'bl:';
const REFRESH_STATE_PREFIX = 'refresh-state:';
const ROTATION_RESULT_PREFIX = 'refresh-rotation:';
const ROTATION_INDEX_PREFIX = 'refresh-rotation-index:';
const ROTATION_REVERSE_PREFIX = 'refresh-rotation-current:';
const ROTATION_RESULT_TTL_SECONDS = 3;

const ROTATE_REFRESH_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 or redis.call('EXISTS', KEYS[2]) == 1 then
  return 0
end
redis.call('SET', KEYS[1], 'consumed')
redis.call('EXPIREAT', KEYS[1], ARGV[1])
if ARGV[2] ~= '' then
  redis.call('HSET', KEYS[3],
    'payload', ARGV[2],
    'consumedStateKey', KEYS[1],
    'consumedExpiresAt', ARGV[1],
    'consumedIndexKey', KEYS[4],
    'replacementStateKey', KEYS[6],
    'replacementExpiresAt', ARGV[4],
    'replacementReverseKey', KEYS[5])
  redis.call('EXPIRE', KEYS[3], ARGV[3])
  redis.call('SET', KEYS[4], KEYS[3], 'EX', ARGV[3])
  redis.call('SET', KEYS[5], KEYS[3], 'EX', ARGV[3])
end
return 1
`;

const REVOKE_REFRESH_SCRIPT = `
local currentExpiresAt = ARGV[1]

local function revokeRotation(resultKey)
  if not resultKey or resultKey == '' then return end
  local consumedStateKey = redis.call('HGET', resultKey, 'consumedStateKey')
  local consumedExpiresAt = redis.call('HGET', resultKey, 'consumedExpiresAt')
  local consumedIndexKey = redis.call('HGET', resultKey, 'consumedIndexKey')
  local replacementStateKey = redis.call('HGET', resultKey, 'replacementStateKey')
  local replacementExpiresAt = redis.call('HGET', resultKey, 'replacementExpiresAt')
  local replacementReverseKey = redis.call('HGET', resultKey, 'replacementReverseKey')
  if consumedStateKey and consumedExpiresAt then
    redis.call('SET', consumedStateKey, 'revoked')
    redis.call('EXPIREAT', consumedStateKey, consumedExpiresAt)
  end
  if replacementStateKey and replacementExpiresAt then
    redis.call('SET', replacementStateKey, 'revoked')
    redis.call('EXPIREAT', replacementStateKey, replacementExpiresAt)
  end
  if consumedIndexKey then redis.call('DEL', consumedIndexKey) end
  if replacementReverseKey then redis.call('DEL', replacementReverseKey) end
  redis.call('DEL', resultKey)
end

local directResult = redis.call('GET', KEYS[2])
local reverseResult = redis.call('GET', KEYS[3])
redis.call('SET', KEYS[1], 'revoked')
redis.call('EXPIREAT', KEYS[1], currentExpiresAt)
revokeRotation(directResult)
if reverseResult ~= directResult then revokeRotation(reverseResult) end
redis.call('DEL', KEYS[2], KEYS[3])
return 1
`;

const READ_ROTATION_SCRIPT = `
local payload = redis.call('HGET', KEYS[1], 'payload')
if not payload then return nil end
local consumedStateKey = redis.call('HGET', KEYS[1], 'consumedStateKey')
local replacementStateKey = redis.call('HGET', KEYS[1], 'replacementStateKey')
if redis.call('GET', consumedStateKey) ~= 'consumed' then return nil end
if redis.call('EXISTS', replacementStateKey) == 1 then return nil end
return payload
`;

export interface RefreshRotationResult {
  accessToken: string;
  refreshToken: string;
}

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const refreshStateKey = (token: string): string =>
  `${REFRESH_STATE_PREFIX}${digest(token)}`;

const legacyBlacklistKey = (token: string): string =>
  `${LEGACY_BLACKLIST_PREFIX}${token}`;

const rotationResultKey = (token: string, rotationKey: string): string =>
  `${ROTATION_RESULT_PREFIX}${digest(token)}:${digest(rotationKey)}`;

const rotationIndexKey = (token: string): string =>
  `${ROTATION_INDEX_PREFIX}${digest(token)}`;

const rotationReverseKey = (token: string): string =>
  `${ROTATION_REVERSE_PREFIX}${digest(token)}`;

const encryptionKey = createHash('sha256')
  .update(env.JWT_REFRESH_SECRET)
  .digest();

const encryptRotation = (tokens: RefreshRotationResult): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(tokens), 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString('base64url'))
    .join('.');
};

const decryptRotation = (payload: string): RefreshRotationResult => {
  const [ivValue, tagValue, ciphertextValue] = payload.split('.');
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Invalid encrypted refresh rotation');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const value = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const parsed = JSON.parse(value) as Partial<RefreshRotationResult>;
  if (
    typeof parsed.accessToken !== 'string' ||
    typeof parsed.refreshToken !== 'string'
  ) {
    throw new Error('Invalid refresh rotation payload');
  }
  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
  };
};

/**
 * Atomically revoke a refresh credential and either side of any active grace
 * rotation. Token digests, rather than credentials, are used as Redis keys.
 */
export const blacklistToken = async (
  token: string,
  expiresAt: number
): Promise<void> => {
  try {
    await redis.eval(
      REVOKE_REFRESH_SCRIPT,
      3,
      refreshStateKey(token),
      rotationIndexKey(token),
      rotationReverseKey(token),
      String(expiresAt)
    );
  } catch (error) {
    logger.error('Failed to blacklist token:', error);
    throw error;
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const [state, legacyState] = await redis.mget(
      refreshStateKey(token),
      legacyBlacklistKey(token)
    );
    return state !== null || legacyState !== null;
  } catch (error) {
    logger.error('Failed to check token blacklist:', error);
    return false;
  }
};

/**
 * Atomically consumes the old refresh token and publishes its encrypted,
 * proof-bound idempotency result. A missing rotation key deliberately disables
 * grace replay for legacy bearer clients without breaking their first refresh.
 */
export const rotateRefreshToken = async (
  consumedToken: string,
  tokens: RefreshRotationResult,
  consumedExpiresAt: number,
  replacementExpiresAt: number,
  rotationKey?: string
): Promise<boolean> => {
  const resultKey = rotationKey
    ? rotationResultKey(consumedToken, rotationKey)
    : `${ROTATION_RESULT_PREFIX}disabled:${digest(consumedToken)}`;
  const encryptedResult = rotationKey ? encryptRotation(tokens) : '';
  const result = await redis.eval(
    ROTATE_REFRESH_SCRIPT,
    6,
    refreshStateKey(consumedToken),
    legacyBlacklistKey(consumedToken),
    resultKey,
    rotationIndexKey(consumedToken),
    rotationReverseKey(tokens.refreshToken),
    refreshStateKey(tokens.refreshToken),
    String(consumedExpiresAt),
    encryptedResult,
    String(ROTATION_RESULT_TTL_SECONDS),
    String(replacementExpiresAt)
  );
  return result === 1;
};

export const getRefreshRotation = async (
  consumedToken: string,
  rotationKey?: string
): Promise<RefreshRotationResult | null> => {
  if (!rotationKey) return null;
  try {
    const payload = await redis.eval(
      READ_ROTATION_SCRIPT,
      1,
      rotationResultKey(consumedToken, rotationKey)
    );
    return typeof payload === 'string' ? decryptRotation(payload) : null;
  } catch (error) {
    logger.error('Failed to read cached refresh rotation:', error);
    throw error;
  }
};

export const waitForRefreshRotation = async (
  consumedToken: string,
  rotationKey?: string,
  timeoutMs = 1000
): Promise<RefreshRotationResult | null> => {
  if (!rotationKey) return null;
  const deadline = Date.now() + timeoutMs;
  do {
    const result = await getRefreshRotation(consumedToken, rotationKey);
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 25));
  } while (Date.now() < deadline);
  return null;
};
