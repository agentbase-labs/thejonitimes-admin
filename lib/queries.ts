import { analytics, articles as articlesDb } from './db';

const DAY = 86400;

function startOfTodayUTC(): number {
  const d = new Date();
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor(utc / 1000);
}

export function kpis() {
  const db = analytics();
  const now = Math.floor(Date.now() / 1000);
  const today0 = startOfTodayUTC();
  const total = (db.prepare('SELECT COUNT(*) AS n FROM pageviews').get() as any).n as number;
  const today = (db.prepare('SELECT COUNT(*) AS n FROM pageviews WHERE ts >= ?').get(today0) as any).n as number;
  const uniqueToday = (db.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM pageviews WHERE ts >= ? AND session_id <> ''").get(today0) as any).n as number;
  const active15 = (db.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM pageviews WHERE ts >= ? AND session_id <> ''").get(now - 900) as any).n as number;
  return { total, today, uniqueToday, active15 };
}

export function pageviewsByDay(days: number = 30) {
  const db = analytics();
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * DAY;
  const rows = db.prepare(`
    SELECT strftime('%Y-%m-%d', ts, 'unixepoch') AS day, COUNT(*) AS n
    FROM pageviews WHERE ts >= ?
    GROUP BY day ORDER BY day ASC
  `).all(from) as { day: string; n: number }[];
  // fill gaps
  const map = new Map(rows.map((r) => [r.day, r.n]));
  const out: { day: string; n: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date((now - i * DAY) * 1000);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: map.get(key) || 0 });
  }
  return out;
}

export function pageviewsByHourToday() {
  const db = analytics();
  const today0 = startOfTodayUTC();
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', ts, 'unixepoch') AS INTEGER) AS hour, COUNT(*) AS n
    FROM pageviews WHERE ts >= ?
    GROUP BY hour ORDER BY hour ASC
  `).all(today0) as { hour: number; n: number }[];
  const map = new Map(rows.map((r) => [r.hour, r.n]));
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, n: map.get(h) || 0 }));
}

export function topCountries(limit = 10) {
  const db = analytics();
  return db.prepare(`
    SELECT country, COUNT(*) AS n FROM pageviews
    WHERE country IS NOT NULL AND country <> ''
    GROUP BY country ORDER BY n DESC LIMIT ?
  `).all(limit) as { country: string; n: number }[];
}

export function deviceSplit() {
  const db = analytics();
  return db.prepare(`
    SELECT COALESCE(device, 'other') AS device, COUNT(*) AS n FROM pageviews
    GROUP BY device ORDER BY n DESC
  `).all() as { device: string; n: number }[];
}

export function topArticlesSafe(limit = 10, sinceTs?: number) {
  const db = analytics();
  let sql: string;
  let args: any[];
  if (sinceTs) {
    sql = `SELECT slug, COUNT(*) AS n FROM pageviews
           WHERE ts >= ? AND slug IS NOT NULL AND slug <> ''
           GROUP BY slug ORDER BY n DESC LIMIT ?`;
    args = [sinceTs, limit];
  } else {
    sql = `SELECT slug, COUNT(*) AS n FROM pageviews
           WHERE slug IS NOT NULL AND slug <> ''
           GROUP BY slug ORDER BY n DESC LIMIT ?`;
    args = [limit];
  }
  const rows = db.prepare(sql).all(...args) as { slug: string; n: number }[];
  const adb = articlesDb();
  if (!adb) return rows.map((r) => ({ ...r, headline: r.slug, topic: '—' }));
  const get = adb.prepare('SELECT slug, headline, topic FROM articles WHERE slug = ?');
  return rows.map((r) => {
    const a = get.get(r.slug) as { slug: string; headline: string; topic: string } | undefined;
    return { ...r, headline: a?.headline || r.slug, topic: a?.topic || '—' };
  });
}

export function recentReferrers(limit = 20) {
  const db = analytics();
  const rows = db.prepare(`
    SELECT referrer, COUNT(*) AS n FROM pageviews
    WHERE referrer IS NOT NULL AND referrer <> ''
    GROUP BY referrer ORDER BY n DESC LIMIT ?
  `).all(limit) as { referrer: string; n: number }[];
  return rows.map((r) => {
    let host = r.referrer;
    try { host = new URL(r.referrer).hostname || r.referrer; } catch {}
    return { ...r, host };
  });
}

export function recentPageviews(limit = 30) {
  const db = analytics();
  const rows = db.prepare(`
    SELECT id, ts, path, slug, country, device, browser, referrer, lang
    FROM pageviews ORDER BY id DESC LIMIT ?
  `).all(limit) as any[];
  const adb = articlesDb();
  if (!adb) return rows;
  const get = adb.prepare('SELECT headline FROM articles WHERE slug = ?');
  return rows.map((r) => {
    if (r.slug) {
      const a = get.get(r.slug) as { headline: string } | undefined;
      r.headline = a?.headline || r.slug;
    }
    return r;
  });
}

export type ArticleStat = {
  id: number;
  slug: string;
  headline: string;
  topic: string;
  published_at: string;
  author: string;
  language: string;
  hero_rank: number | null;
  views_total: number;
  views_today: number;
};

export function articleStats(): ArticleStat[] {
  const db = analytics();
  const adb = articlesDb();
  if (!adb) return [];
  const today0 = startOfTodayUTC();
  const total = new Map<string, number>();
  for (const r of db.prepare(`
    SELECT slug, COUNT(*) AS n FROM pageviews
    WHERE slug IS NOT NULL AND slug <> ''
    GROUP BY slug
  `).all() as { slug: string; n: number }[]) total.set(r.slug, r.n);
  const today = new Map<string, number>();
  for (const r of db.prepare(`
    SELECT slug, COUNT(*) AS n FROM pageviews
    WHERE slug IS NOT NULL AND slug <> '' AND ts >= ?
    GROUP BY slug
  `).all(today0) as { slug: string; n: number }[]) today.set(r.slug, r.n);

  const arts = adb.prepare(`
    SELECT id, slug, headline, topic, published_at, author, language, hero_rank
    FROM articles ORDER BY datetime(published_at) DESC
  `).all() as any[];
  return arts.map((a) => ({
    ...a,
    views_total: total.get(a.slug) || 0,
    views_today: today.get(a.slug) || 0,
  }));
}
