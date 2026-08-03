import { Request, Response, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';

export const ACCESS_COOKIE_NAME = '__Secure-access_token';
export const REFRESH_COOKIE_NAME = '__Secure-refresh_token';
export const COOKIE_AUTH_MODE = 'cookie';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
};

function tokenMaxAge(token: string): number | undefined {
  const decoded = jwt.decode(token);
  if (
    !decoded ||
    typeof decoded === 'string' ||
    typeof decoded.exp !== 'number'
  )
    return undefined;
  return Math.max(0, decoded.exp * 1000 - Date.now());
}

export function isCookieAuthRequest(req: Request): boolean {
  return req.get('X-Auth-Mode')?.toLowerCase() === COOKIE_AUTH_MODE;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const entry of header.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    const value = entry.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void {
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseCookieOptions,
    path: '/api/v1',
    maxAge: tokenMaxAge(tokens.accessToken),
  });
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseCookieOptions,
    path: '/api/v1/auth',
    maxAge: tokenMaxAge(tokens.refreshToken),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    ...baseCookieOptions,
    path: '/api/v1',
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...baseCookieOptions,
    path: '/api/v1/auth',
  });
}
