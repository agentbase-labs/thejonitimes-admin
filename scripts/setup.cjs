#!/usr/bin/env node
/**
 * Setup script:
 *   - creates data/analytics.db with schema
 *   - copies articles DB from ../thejonitimes/data/articles.db
 *   - writes .env.local template if missing
 *   - seeds ~300 fake pageviews across the last 7 days for demo
 *
 * SEED NOTE: The seed data is labeled (referrer starts with 'seed://').
 * To purge seeds: DELETE FROM pageviews WHERE referrer LIKE 'seed://%';
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const ANALYTICS = path.join(DATA, 'analytics.db');
const ARTICLES = path.join(DATA, 'articles.db');
const ENV_PATH = path.join(ROOT, '.env.local');
const SRC_ARTICLES = path.resolve(ROOT, '..', 'thejonitimes', 'data', 'articles.db');

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

// 1) Ensure articles DB. Priority:
//    a) If already present, keep it.
//    b) Else if base64 shipped (data/articles.db.b64), decode it.
//    c) Else if source exists at ../thejonitimes/data/articles.db, copy it.
const ARTICLES_B64 = path.join(DATA, 'articles.db.b64');
if (fs.existsSync(ARTICLES)) {
  console.log(`• articles.db already present at ${ARTICLES} — keeping it`);
} else if (fs.existsSync(ARTICLES_B64)) {
  const b64 = fs.readFileSync(ARTICLES_B64, 'utf8').replace(/\s+/g, '');
  fs.writeFileSync(ARTICLES, Buffer.from(b64, 'base64'));
  console.log(`✓ Decoded articles.db from ${ARTICLES_B64} (${fs.statSync(ARTICLES).size} bytes)`);
} else if (fs.existsSync(SRC_ARTICLES)) {
  fs.copyFileSync(SRC_ARTICLES, ARTICLES);
  console.log(`✓ Copied ${SRC_ARTICLES} -> ${ARTICLES}`);
} else {
  console.warn(`! No articles.db source available; dashboard will fall back to slugs.`);
}

// 2) Create analytics DB + schema
const db = new Database(ANALYTICS);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS pageviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT,
    country TEXT,
    user_agent TEXT,
    device TEXT,
    browser TEXT,
    session_id TEXT,
    slug TEXT,
    lang TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pageviews_ts ON pageviews(ts DESC);
  CREATE INDEX IF NOT EXISTS idx_pageviews_slug ON pageviews(slug);
  CREATE INDEX IF NOT EXISTS idx_pageviews_country ON pageviews(country);
`);
console.log(`✓ analytics.db initialized`);

// 3) .env.local template
if (!fs.existsSync(ENV_PATH)) {
  const sec = require('crypto').randomBytes(32).toString('hex');
  fs.writeFileSync(ENV_PATH, [
    `JWT_SECRET=${sec}`,
    `ADMIN_PASSWORD_HASH=$2a$10$DUNqW2NnSe/k.sUxhAuUPus3F3rEU3mEZTlsVCT1CaLZWbHNrDGJ2`,
    `ADMIN_PASSWORD_ROTATED_AT=2026-05-08`,
    `PORT=3000`,
    ``,
  ].join('\n'));
  console.log(`✓ wrote .env.local with fresh JWT_SECRET`);
} else {
  console.log(`• .env.local already exists — keeping it`);
}

// 4) Seed ~300 fake pageviews (LOCAL DEV ONLY)
// On Render (RENDER env var set) we never seed, and we also purge any previous seed rows.
const IS_RENDER = !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;
const SKIP_SEED = IS_RENDER || process.env.SKIP_SEED === '1' || process.env.NODE_ENV === 'production';

if (SKIP_SEED) {
  const purged = db.prepare("DELETE FROM pageviews WHERE referrer LIKE 'seed://%' OR session_id LIKE 'seed_%'").run();
  console.log(`• production mode: skipping seed; purged ${purged.changes} existing seed rows`);
  db.close();
  console.log('\nDone. Next: npm run build && npm run start');
  process.exit(0);
}

const existing = db.prepare('SELECT COUNT(*) AS n FROM pageviews').get().n;
if (existing === 0) {
  let slugs = [];
  try {
    if (fs.existsSync(ARTICLES)) {
      const a = new Database(ARTICLES, { readonly: true });
      slugs = a.prepare('SELECT slug, language FROM articles').all();
      a.close();
    }
  } catch (e) {
    console.warn('! Could not read articles for seeding:', e.message);
  }
  if (slugs.length === 0) {
    slugs = [
      { slug: 'musk-altman-trial-week-two', language: 'en' },
      { slug: 'fed-rate-signal-shift', language: 'en' },
      { slug: 'deni-avdija-rise', language: 'en' },
    ];
  }

  const countries = ['IL','US','GB','DE','FR','IN','BR','CA'];
  const weights = [20, 35, 10, 8, 6, 10, 6, 5]; // rough share
  const pickWeighted = (arr, ws) => {
    const sum = ws.reduce((a,b)=>a+b,0);
    let r = Math.random() * sum;
    for (let i=0;i<arr.length;i++){ r -= ws[i]; if (r<=0) return arr[i]; }
    return arr[arr.length-1];
  };
  const devices = ['desktop','mobile','tablet','bot'];
  const deviceWeights = [55, 40, 3, 2];
  const browsers = ['chrome','safari','firefox','edge','other'];
  const browserWeights = [55, 25, 10, 8, 2];
  const refs = [
    '', '', '', '',
    'https://www.google.com/',
    'https://news.ycombinator.com/',
    'https://t.co/',
    'https://www.reddit.com/r/news/',
    'https://twitter.com/',
    'https://www.facebook.com/',
    'https://duckduckgo.com/',
    'https://www.linkedin.com/',
    'https://www.bing.com/',
  ];
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  ];

  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 86400;
  const stmt = db.prepare(`
    INSERT INTO pageviews (ts, path, referrer, country, user_agent, device, browser, session_id, slug, lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const ins = db.transaction((rows) => {
    for (const r of rows) stmt.run(...r);
  });

  // simulate ~60 unique sessions, each with 3–8 pageviews
  const N_SESSIONS = 60;
  const rows = [];
  for (let s = 0; s < N_SESSIONS; s++) {
    const country = pickWeighted(countries, weights);
    const device = pickWeighted(devices, deviceWeights);
    const browser = pickWeighted(browsers, browserWeights);
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
    const sid = 'seed_' + Math.random().toString(36).slice(2, 10);
    const pages = 3 + Math.floor(Math.random() * 6);
    const startTs = weekAgo + Math.floor(Math.random() * (7 * 86400));
    for (let p = 0; p < pages; p++) {
      const ts = Math.min(now - 60, startTs + p * (30 + Math.floor(Math.random() * 600)));
      const art = slugs[Math.floor(Math.random() * slugs.length)];
      const lang = art.language || 'en';
      const prefix = lang === 'he' ? '/he' : lang === 'ar' ? '/ar' : '';
      // 25% homepage, 75% article
      const onHome = Math.random() < 0.25;
      const path = onHome ? (prefix || '/') : `${prefix}/article/${art.slug}/`;
      const slug = onHome ? null : art.slug;
      const ref = refs[Math.floor(Math.random() * refs.length)] || 'seed://';
      rows.push([
        ts,
        path === '' ? '/' : path,
        ref,
        country,
        ua,
        device,
        browser,
        sid,
        slug,
        lang,
      ]);
    }
  }
  // Also add a chunk of single-page homepage hits
  for (let i = 0; i < 60; i++) {
    const ts = weekAgo + Math.floor(Math.random() * (7 * 86400));
    const country = pickWeighted(countries, weights);
    rows.push([
      ts, '/', 'seed://', country,
      userAgents[0], pickWeighted(devices, deviceWeights), 'chrome',
      'seed_one_' + i, null, 'en',
    ]);
  }
  ins(rows);
  console.log(`✓ seeded ${rows.length} demo pageviews`);
  console.log(`  (purge with: DELETE FROM pageviews WHERE referrer LIKE 'seed://%' OR session_id LIKE 'seed_%';)`);
} else {
  console.log(`• pageviews table already has ${existing} rows — skipping seed`);
}

db.close();
console.log('\nDone. Next: npm run build && npm run start');