import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'tjt_admin';
const ALG = 'HS256';

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET || 'dev-insecure-change-me-dev-insecure-change-me';
  return new TextEncoder().encode(s);
}

export const ADMIN_USERNAME = 'admin';

/**
 * Default password hash corresponds to `thejoni2026!` (bcrypt, cost 10).
 * Override by setting ADMIN_PASSWORD_HASH in env.
 * Generate a new one with:
 *   node -e "console.log(require('bcryptjs').hashSync('new-password', 10))"
 */
const DEFAULT_HASH = '$2a$10$DUNqW2NnSe/k.sUxhAuUPus3F3rEU3mEZTlsVCT1CaLZWbHNrDGJ2';

export function passwordHash(): string {
  return process.env.ADMIN_PASSWORD_HASH || DEFAULT_HASH;
}

export function rotatedAt(): string {
  return process.env.ADMIN_PASSWORD_ROTATED_AT || '2026-05-08';
}

export async function verifyPassword(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) return false;
  try {
    return await bcrypt.compare(password, passwordHash());
  } catch {
    return false;
  }
}

export async function mintSession(): Promise<string> {
  const jwt = await new SignJWT({ u: ADMIN_USERNAME })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
  return jwt;
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function readSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
