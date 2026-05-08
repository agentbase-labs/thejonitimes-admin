'use strict';
const express = require('express');
const session = require('express-session');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'joni123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'thejonitimes-admin-secret-2026';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/articles.db');

// ─── DB setup ───────────────────────────────────────────────────────────────
// Ensure the data directory exists before opening the DB
const dbDir = path.dirname(DB_PATH);
if (!require('fs').existsSync(dbDir)) {
  require('fs').mkdirSync(dbDir, { recursive: true });
}
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS page_views (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL,
    country     TEXT    NOT NULL DEFAULT 'Unknown',
    viewed_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_pv_slug      ON page_views(slug);
  CREATE INDEX IF NOT EXISTS idx_pv_viewed_at ON page_views(viewed_at);
  CREATE INDEX IF NOT EXISTS idx_pv_country   ON page_views(country);
`);

// ─── Articles sync from main site ─────────────────────────────────────────────
const ARTICLES_DATA_URL = process.env.ARTICLES_DATA_URL || 'https://thejonitimes.com/articles-data.json';

async function syncArticles() {
  try {
    const { default: https } = await import('https');
    const { default: http } = await import('http');
    const lib = ARTICLES_DATA_URL.startsWith('https') ? https : http;
    const data = await new Promise((resolve, reject) => {
      lib.get(ARTICLES_DATA_URL, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
        });
      }).on('error', reject);
    });
    if (!data || !data.articles) return;
    // Ensure articles table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        headline TEXT NOT NULL,
        subheadline TEXT NOT NULL DEFAULT '',
        body_md TEXT NOT NULL DEFAULT '',
        topic TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        image_path TEXT NOT NULL DEFAULT '',
        published_at TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT 'Joni',
        language TEXT NOT NULL DEFAULT 'en',
        hero_rank INTEGER NOT NULL DEFAULT 0
      );
    `);
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO articles (id, slug, headline, subheadline, body_md, topic, tags_json, image_path, published_at, author, language, hero_rank)
      VALUES (@id, @slug, @headline, @subheadline, @body_md, @topic, @tags_json, @image_path, @published_at, @author, @language, @hero_rank)
    `);
    const upsertMany = db.transaction((rows) => {
      for (const row of rows) {
        upsert.run({
          id: row.id,
          slug: row.slug,
          headline: row.headline,
          subheadline: row.subheadline || '',
          body_md: row.body_md || '',
          topic: row.topic,
          tags_json: row.tags_json || '[]',
          image_path: row.image_path || '',
          published_at: row.published_at,
          author: row.author || 'Joni',
          language: row.language || 'en',
          hero_rank: row.hero_rank || 0
        });
      }
    });
    upsertMany(data.articles);
    console.log(`[sync] Synced ${data.articles.length} articles from main site`);
  } catch(e) {
    console.warn('[sync] Could not sync articles:', e.message);
  }
}

// Sync on startup and every 5 minutes
syncArticles();
setInterval(syncArticles, 5 * 60 * 1000);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 86400000 }
}));

// CORS – allow tracking from main site
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Auth guard
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.redirect('/admin/login');
}

// ─── Auth routes ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/admin'));

app.get('/admin/login', (req, res) => {
  const err = req.query.err ? '<p class="error">Incorrect password.</p>' : '';
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Joni Times · Admin Login</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0d0d0f;color:#e8e8e8;font-family:'Inter',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#161618;border:1px solid #222;border-radius:12px;padding:48px 40px;width:100%;max-width:400px;text-align:center}
  .masthead{font-size:1.05rem;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:8px}
  h1{font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:32px}
  .accent{color:#c1272d}
  input[type=password]{width:100%;background:#0d0d0f;border:1px solid #333;border-radius:8px;padding:14px 16px;color:#fff;font-size:1rem;font-family:'Inter',sans-serif;outline:none;margin-bottom:16px;transition:border .2s}
  input[type=password]:focus{border-color:#c1272d}
  button{width:100%;background:#c1272d;border:none;border-radius:8px;padding:14px;color:#fff;font-size:1rem;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;transition:background .2s}
  button:hover{background:#a01f27}
  .error{color:#c1272d;font-size:.875rem;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <p class="masthead">The Joni Times</p>
  <h1>Admin <span class="accent">Access</span></h1>
  ${err}
  <form method="POST" action="/admin/login">
    <input type="password" name="password" placeholder="Enter password" autofocus autocomplete="current-password">
    <button type="submit">Sign In</button>
  </form>
</div>
</body>
</html>`);
});

app.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect(303, '/admin');
  }
  res.redirect(303, '/admin/login?err=1');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ─── Tracking endpoint (public – called from main site) ─────────────────────
app.post('/api/track', (req, res) => {
  const { slug, country = 'Unknown' } = req.body || {};
  if (!slug) return res.sendStatus(400);
  try {
    db.prepare('INSERT INTO page_views (slug, country) VALUES (?, ?)').run(String(slug), String(country));
    res.sendStatus(200);
  } catch (e) {
    console.error('track error:', e.message);
    res.sendStatus(500);
  }
});

// ─── Stats API ───────────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const articlesTotal = db.prepare('SELECT COUNT(*) AS c FROM articles').get().c;
    const articlesToday = db.prepare("SELECT COUNT(*) AS c FROM articles WHERE date(published_at) = date('now')").get().c;

    const byTopicRows = db.prepare('SELECT topic, COUNT(*) AS c FROM articles GROUP BY topic ORDER BY c DESC').all();
    const byTopic = {};
    for (const r of byTopicRows) byTopic[r.topic] = r.c;

    const byDay30Articles = db.prepare(`
      SELECT date(published_at) AS date, COUNT(*) AS count
      FROM articles
      WHERE published_at >= date('now', '-30 days')
      GROUP BY date(published_at)
      ORDER BY date ASC
    `).all();

    const top10Viewed = db.prepare(`
      SELECT a.slug, a.headline, a.topic, COUNT(pv.id) AS views
      FROM articles a
      LEFT JOIN page_views pv ON pv.slug = a.slug
      GROUP BY a.slug
      ORDER BY views DESC, a.published_at DESC
      LIMIT 10
    `).all();

    // Tags: parse tags_json from each article
    const allArticleRows = db.prepare('SELECT tags_json FROM articles').all();
    const tagMap = {};
    for (const row of allArticleRows) {
      try {
        const tags = JSON.parse(row.tags_json || '[]');
        for (const t of tags) { tagMap[t] = (tagMap[t] || 0) + 1; }
      } catch {}
    }
    const allTags = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const viewsTotal = db.prepare('SELECT COUNT(*) AS c FROM page_views').get().c;
    const viewsToday = db.prepare("SELECT COUNT(*) AS c FROM page_views WHERE date(viewed_at) = date('now')").get().c;

    const byCountry = db.prepare(`
      SELECT country, COUNT(*) AS count
      FROM page_views
      GROUP BY country
      ORDER BY count DESC
      LIMIT 30
    `).all();

    const byDay30Views = db.prepare(`
      SELECT date(viewed_at) AS date, COUNT(*) AS count
      FROM page_views
      WHERE viewed_at >= date('now', '-30 days')
      GROUP BY date(viewed_at)
      ORDER BY date ASC
    `).all();

    res.json({
      articles: {
        total: articlesTotal,
        today: articlesToday,
        by_topic: byTopic,
        by_day_30: byDay30Articles,
        top_10_viewed: top10Viewed,
        all_tags: allTags
      },
      views: {
        total: viewsTotal,
        today: viewsToday,
        by_country: byCountry,
        by_day_30: byDay30Views
      }
    });
  } catch (e) {
    console.error('stats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Dashboard HTML ──────────────────────────────────────────────────────────
app.get('/admin', requireAuth, (req, res) => {
  res.send(DASHBOARD_HTML);
});

app.listen(PORT, () => {
  console.log(`[TheJoniTimes Admin] listening on http://localhost:${PORT}`);
});

// ─── Dashboard HTML (inline) ─────────────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Joni Times · Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#0d0d0f;--card:#161618;--border:#222;--accent:#c1272d;--accent2:#e63946;--text:#e8e8e8;--muted:#888;--green:#22c55e;--blue:#3b82f6}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh}

  /* Header */
  header{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--border);background:#111113}
  .logo{display:flex;align-items:center;gap:12px}
  .logo-dot{width:10px;height:10px;background:var(--accent);border-radius:50%}
  .logo-text{font-size:1.1rem;font-weight:700;letter-spacing:.02em}
  .logo-sub{font-size:.75rem;color:var(--muted);letter-spacing:.12em;text-transform:uppercase}
  .header-right{display:flex;align-items:center;gap:20px}
  .updated{font-size:.8rem;color:var(--muted)}
  .logout-btn{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;font-family:'Inter',sans-serif;transition:all .2s}
  .logout-btn:hover{border-color:var(--accent);color:var(--accent)}

  /* Main */
  main{padding:28px 32px;max-width:1400px;margin:0 auto}

  /* KPI cards */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
  .kpi-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px 20px}
  .kpi-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
  .kpi-value{font-size:2.2rem;font-weight:700;line-height:1}
  .kpi-sub{font-size:.8rem;color:var(--muted);margin-top:8px}
  .kpi-accent{color:var(--accent)}
  .kpi-green{color:var(--green)}

  /* Charts row */
  .charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .chart-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px}
  .chart-title{font-size:.9rem;font-weight:600;color:var(--text);margin-bottom:20px}
  .chart-wrap{position:relative;height:220px}

  /* Tables row */
  .tables-grid{display:grid;grid-template-columns:3fr 2fr;gap:16px;margin-bottom:24px}
  .table-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px}
  .table-title{font-size:.9rem;font-weight:600;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:.82rem}
  th{text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;border-bottom:1px solid var(--border);font-size:.75rem;text-transform:uppercase;letter-spacing:.06em}
  td{padding:10px 10px;border-bottom:1px solid #1a1a1c;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:rgba(255,255,255,.02)}
  .rank{color:var(--muted);font-size:.75rem;width:28px}
  .headline-cell{max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
  .badge-ai{background:#1e3a5f;color:#60a5fa}
  .badge-economy{background:#1a3320;color:#4ade80}
  .badge-politics{background:#3a1a1a;color:#f87171}
  .badge-crypto{background:#2d1f5e;color:#a78bfa}
  .badge-sports{background:#1a2e3a;color:#38bdf8}
  .badge-lifestyle{background:#3a2a1a;color:#fb923c}
  .views-num{font-weight:600;color:var(--accent);text-align:right}
  .country-flag{margin-right:6px}
  .bar-wrap{width:80px;background:#222;border-radius:3px;height:6px;display:inline-block;vertical-align:middle;margin-left:8px}
  .bar-fill{height:6px;background:var(--accent);border-radius:3px}

  /* Bottom row */
  .bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .tags-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .tag-pill{background:#1e1e20;border:1px solid #2a2a2c;border-radius:20px;padding:4px 12px;font-size:.78rem;color:var(--muted);display:flex;align-items:center;gap:6px}
  .tag-pill .tag-count{background:var(--accent);color:#fff;border-radius:10px;padding:1px 7px;font-size:.7rem;font-weight:700}

  /* Loading/error states */
  .loading{text-align:center;padding:60px;color:var(--muted)}
  .spinner{width:32px;height:32px;border:3px solid #222;border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Responsive */
  @media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.charts-grid,.tables-grid,.bottom-grid{grid-template-columns:1fr}}
  @media(max-width:600px){main{padding:16px}.kpi-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-dot"></div>
    <div>
      <div class="logo-text">The Joni Times</div>
      <div class="logo-sub">Admin Dashboard</div>
    </div>
  </div>
  <div class="header-right">
    <span class="updated" id="lastUpdated">–</span>
    <form method="POST" action="/logout" style="display:inline">
      <button class="logout-btn" type="submit">Sign out</button>
    </form>
  </div>
</header>

<main>
  <div id="loadingState" class="loading">
    <div class="spinner"></div>
    <div>Loading stats…</div>
  </div>

  <div id="dashContent" style="display:none">

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Views</div>
        <div class="kpi-value" id="kpiViewsTotal">–</div>
        <div class="kpi-sub" id="kpiViewsTodaySub">– today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Views Today</div>
        <div class="kpi-value kpi-accent" id="kpiViewsToday">–</div>
        <div class="kpi-sub">last 24h</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Articles</div>
        <div class="kpi-value" id="kpiArticlesTotal">–</div>
        <div class="kpi-sub" id="kpiArticlesTodaySub">– today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Published Today</div>
        <div class="kpi-value kpi-green" id="kpiArticlesToday">–</div>
        <div class="kpi-sub">new articles</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">📈 Views — Last 30 Days</div>
        <div class="chart-wrap"><canvas id="chartViews"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📰 Articles Published — Last 30 Days</div>
        <div class="chart-wrap"><canvas id="chartArticles"></canvas></div>
      </div>
    </div>

    <!-- Tables -->
    <div class="tables-grid">
      <div class="table-card">
        <div class="table-title">🔥 Top 10 Most Viewed Articles</div>
        <table>
          <thead><tr><th>#</th><th>Headline</th><th>Topic</th><th style="text-align:right">Views</th></tr></thead>
          <tbody id="topArticlesBody"></tbody>
        </table>
      </div>
      <div class="table-card">
        <div class="table-title">🌍 Visits by Country</div>
        <table>
          <thead><tr><th>Country</th><th style="text-align:right">Visits</th><th></th></tr></thead>
          <tbody id="countryBody"></tbody>
        </table>
      </div>
    </div>

    <!-- Bottom -->
    <div class="bottom-grid">
      <div class="chart-card">
        <div class="chart-title">📊 Articles by Topic</div>
        <div class="chart-wrap"><canvas id="chartTopics"></canvas></div>
      </div>
      <div class="table-card">
        <div class="table-title">🏷️ Top Tags</div>
        <div class="tags-wrap" id="tagsWrap"></div>
      </div>
    </div>

  </div><!-- /dashContent -->
</main>

<script>
  // Country code → flag emoji helper
  function flagEmoji(code) {
    if (!code || code.length !== 2) return '🌐';
    try {
      return code.toUpperCase().split('').map(c =>
        String.fromCodePoint(c.codePointAt(0) + 127397)
      ).join('');
    } catch { return '🌐'; }
  }

  // Format numbers with commas
  function fmt(n) { return Number(n).toLocaleString(); }

  // Fill last-30-day date gaps with 0
  function fillDays(rows, field='count') {
    const map = {};
    for (const r of rows) map[r.date] = r[field] || r.count;
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      result.push({ date: key, count: map[key] || 0 });
    }
    return result;
  }

  const TOPIC_COLORS = {
    ai: '#60a5fa', economy: '#4ade80', politics: '#f87171',
    crypto: '#a78bfa', sports: '#38bdf8', lifestyle: '#fb923c'
  };

  let chartViews, chartArticles, chartTopics;

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('API error ' + res.status);
      const s = await res.json();

      // KPI
      document.getElementById('kpiViewsTotal').textContent = fmt(s.views.total);
      document.getElementById('kpiViewsToday').textContent = fmt(s.views.today);
      document.getElementById('kpiViewsTodaySub').textContent = fmt(s.views.today) + ' today';
      document.getElementById('kpiArticlesTotal').textContent = fmt(s.articles.total);
      document.getElementById('kpiArticlesToday').textContent = fmt(s.articles.today);
      document.getElementById('kpiArticlesTodaySub').textContent = fmt(s.articles.today) + ' today';

      // Views chart
      const viewDays = fillDays(s.views.by_day_30);
      const viewLabels = viewDays.map(d => d.date.slice(5));
      const viewData = viewDays.map(d => d.count);
      if (chartViews) chartViews.destroy();
      chartViews = new Chart(document.getElementById('chartViews'), {
        type: 'line',
        data: {
          labels: viewLabels,
          datasets: [{ label: 'Views', data: viewData, borderColor: '#c1272d', backgroundColor: 'rgba(193,39,45,.12)', fill: true, tension: .3, pointRadius: 2, pointHoverRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#666', font: { size: 10 } }, grid: { color: '#1e1e20' } },
            y: { ticks: { color: '#666', font: { size: 10 } }, grid: { color: '#1e1e20' }, beginAtZero: true }
          }
        }
      });

      // Articles chart
      const artDays = fillDays(s.articles.by_day_30);
      const artLabels = artDays.map(d => d.date.slice(5));
      const artData = artDays.map(d => d.count);
      if (chartArticles) chartArticles.destroy();
      chartArticles = new Chart(document.getElementById('chartArticles'), {
        type: 'bar',
        data: {
          labels: artLabels,
          datasets: [{ label: 'Articles', data: artData, backgroundColor: 'rgba(59,130,246,.6)', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#666', font: { size: 10 } }, grid: { color: '#1e1e20' } },
            y: { ticks: { color: '#666', font: { size: 10 } }, grid: { color: '#1e1e20' }, beginAtZero: true }
          }
        }
      });

      // Top articles table
      const tbody = document.getElementById('topArticlesBody');
      tbody.innerHTML = s.articles.top_10_viewed.map((a, i) => {
        const cls = 'badge badge-' + (a.topic || '');
        const hl = (a.headline || '').split('.')[0];
        return '<tr>' +
          '<td class="rank">' + (i+1) + '</td>' +
          '<td class="headline-cell" title="' + (a.headline||'').replace(/"/g,'&quot;') + '">' + hl + '</td>' +
          '<td><span class="' + cls + '">' + (a.topic||'') + '</span></td>' +
          '<td class="views-num">' + fmt(a.views) + '</td>' +
          '</tr>';
      }).join('');

      // Country table
      const maxViews = s.views.by_country.length ? s.views.by_country[0].count : 1;
      document.getElementById('countryBody').innerHTML = s.views.by_country.map(r => {
        const pct = Math.round(r.count / (s.views.total || 1) * 100);
        const barW = Math.round(r.count / maxViews * 100);
        const flag = r.country.length === 2 ? flagEmoji(r.country) : '🌐';
        return '<tr>' +
          '<td><span class="country-flag">' + flag + '</span>' + r.country + '</td>' +
          '<td style="text-align:right;font-weight:600">' + fmt(r.count) + '</td>' +
          '<td><div class="bar-wrap"><div class="bar-fill" style="width:' + barW + '%"></div></div> <span style="font-size:.72rem;color:#666">' + pct + '%</span></td>' +
          '</tr>';
      }).join('') || '<tr><td colspan="3" style="color:#666;text-align:center;padding:24px">No view data yet</td></tr>';

      // Topic donut
      const topicLabels = Object.keys(s.articles.by_topic);
      const topicData = Object.values(s.articles.by_topic);
      const topicColors = topicLabels.map(t => TOPIC_COLORS[t] || '#888');
      if (chartTopics) chartTopics.destroy();
      chartTopics = new Chart(document.getElementById('chartTopics'), {
        type: 'doughnut',
        data: {
          labels: topicLabels.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
          datasets: [{ data: topicData, backgroundColor: topicColors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#aaa', font: { size: 12 }, padding: 14 } }
          },
          cutout: '62%'
        }
      });

      // Tags
      document.getElementById('tagsWrap').innerHTML = s.articles.all_tags.map(t =>
        '<div class="tag-pill">' + t.tag + '<span class="tag-count">' + t.count + '</span></div>'
      ).join('');

      // Update timestamp
      document.getElementById('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString();

      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('dashContent').style.display = '';
    } catch(e) {
      document.getElementById('loadingState').innerHTML = '<p style="color:#c1272d">Error loading stats: ' + e.message + '</p>';
    }
  }

  loadStats();
  setInterval(loadStats, 60000);
</script>
</body>
</html>`;
