import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function redirect(req: NextRequest) {
  clearSessionCookie();
  const url = new URL('/login', req.url);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) { return redirect(req); }
export async function GET(req: NextRequest)  { return redirect(req); }
