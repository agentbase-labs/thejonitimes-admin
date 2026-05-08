import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = 'tjt_admin';
const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/beacon',
  '/b.js',
  '/favicon.ico',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/beacon')) return true;
  return false;
}

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET || 'dev-insecure-change-me-dev-insecure-change-me';
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const tok = req.cookies.get(COOKIE)?.value;
  if (!tok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  try {
    await jwtVerify(tok, secretKey());
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete(COOKIE);
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
