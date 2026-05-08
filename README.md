# TheJoniTimes Admin Dashboard

A standalone Express server serving a secure, dark-mode admin dashboard for TheJoniTimes editorial team.

## Features

- 🔐 Password-protected login
- 📊 Real-time stats: total views, views today, views by country
- 📰 Article counts, top 10 most viewed, articles by topic
- 📈 Charts: 30-day views trend, 30-day publish trend, topic donut
- 🏷️ Top tags cloud
- 🌍 Country breakdown with flag emojis + bar charts
- Auto-refreshes every 60 seconds

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_PASSWORD` | ✅ Yes | `admin` | Login password |
| `PORT` | No | `3001` | Server port |
| `SESSION_SECRET` | No | (insecure default) | Express session secret — set in prod! |
| `DB_PATH` | No | `../data/articles.db` | Absolute path to SQLite DB |

## Run Locally

```bash
cd admin-server
npm install
ADMIN_PASSWORD=yourpassword node server.js
# Open http://localhost:3001/admin
```

## Deploy to Render

The `render.yaml` in this directory defines a Web Service:

1. Go to Render → New Web Service → connect your repo
2. Set root directory to `admin-server/`
3. Set env vars: `ADMIN_PASSWORD`, `SESSION_SECRET`
4. For `DB_PATH`: use a Render disk mount at `/data/articles.db`
   - The disk must be shared with the main site's DB (or synced)

## Tracking Page Views

To track views from the main static site, add this snippet to each page:

```html
<script>
(function() {
  var TRACKER = 'https://your-admin-server.onrender.com/api/track';
  var slug = window.location.pathname.replace(/^\/article\//, '').replace(/\/$/, '');
  if (!slug || slug === '') return;
  fetch(TRACKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: slug, country: 'Unknown' })
  }).catch(function(){});
})();
</script>
```

For country detection, use a geo-IP service (e.g. `https://ipapi.co/json/`) and pass `country` in the request.

## Notes

- The `page_views` table is auto-created in the SQLite DB on first run
- The `/api/track` endpoint is public (CORS *) — no auth needed for the main site to call it
- Session cookies expire after 24 hours
