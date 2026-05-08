import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, mintSession, setSessionCookie } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const ok = await verifyPassword(username, password);
    if (!ok) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const token = await mintSession();
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
