import { NextResponse } from 'next/server';
import { recentPageviews, kpis } from '../../../lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recent = recentPageviews(30);
    const k = kpis();
    return NextResponse.json({ ok: true, recent, kpis: k });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
