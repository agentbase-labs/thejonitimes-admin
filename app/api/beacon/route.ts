import { NextRequest, NextResponse } from 'next/server';
import { analytics } from '../../../lib/db';
import { UAParser } from 'ua-parser-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// -------- rate limiter (60 req/sec per IP, in-memory) --------
const hits = new Map<string, { count: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now > cur.reset) {
    hits.set(ip, { count: 1, reset: now + 1000 });
    return false;
  }
  cur.count++;
  if (cur.count > 60) return true;
  return false;
}
// ----------------------------------------------------------

function pickIP(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function deriveSlug(path: string): string | null {
  try {
    const p = path.split('?')[0];
    const m = p.match(/\/article\/([^/]+)\/?$/);
    return m ? m[1] : null;
  } catch { return null; }
}

function deriveLang(path: string): string {
  if (path.startsWith('/he/') || path === '/he') return 'he';
  if (path.startsWith('/ar/') || path === '/ar') return 'ar';
  return 'en';
}

function deriveDevice(ua: string, parsed: any): string {
  const lua = (ua || '').toLowerCase();
  if (/bot|crawler|spider|slurp|facebookexternalhit|googlebot|bingbot|duckduck/.test(lua)) return 'bot';
  const t = parsed?.device?.type;
  if (t === 'mobile' || t === 'tablet') return t;
  return 'desktop';
}

function deriveBrowser(parsed: any): string {
  const n = (parsed?.browser?.name || '').toLowerCase();
  if (!n) return 'other';
  if (n.includes('chrome')) return 'chrome';
  if (n.includes('safari')) return 'safari';
  if (n.includes('firefox')) return 'firefox';
  if (n.includes('edge')) return 'edge';
  return 'other';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = pickIP(req);
  if (limited(ip)) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  let body: any = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : '/';
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : '';
  const sid = typeof body.sid === 'string' ? body.sid.slice(0, 64) : '';
  const ts = Math.floor(Date.now() / 1000);

  const country = (req.headers.get('cf-ipcountry') || 'XX').toUpperCase().slice(0, 2);
  const ua = (req.headers.get('user-agent') || '').slice(0, 500);
  const parsed = new UAParser(ua).getResult();
  const device = deriveDevice(ua, parsed);
  const browser = deriveBrowser(parsed);
  const slug = deriveSlug(path);
  const lang = deriveLang(path);

  try {
    const db = analytics();
    db.prepare(`
      INSERT INTO pageviews (ts, path, referrer, country, user_agent, device, browser, session_id, slug, lang)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ts, path, referrer, country, ua, device, browser, sid, slug, lang);
  } catch (e) {
    // swallow — beacon must never fail loudly
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
