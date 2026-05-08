# TheJoniTimes — Admin

Private analytics dashboard for [thejonitimes.com](https://thejonitimes.com).

- Next.js 14 App Router, **server** (not static export).
- SQLite (`better-sqlite3`) for analytics storage; read-only mirror of the main site's articles DB.
- JWT session cookie + bcrypt password (single admin user).
- Lightweight `/b.js` beacon served from this app; main site loads it as `<script async src="https://admin.thejonitimes.com/b.js"></script>`.

## Local dev

```bash
npm install
npm run setup        # creates data/analytics.db + copies articles.db + writes .env.local + seeds demo data
npm run build
npm run start        # http://localhost:3000
```

Login: `admin` / `thejoni2026!`

## Environment

| Var                         | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `JWT_SECRET`                | Signs the session cookie. 32+ random bytes.          |
| `ADMIN_PASSWORD_HASH`       | bcrypt hash of admin password (override default).    |
| `ADMIN_PASSWORD_ROTATED_AT` | Display-only date shown on Settings page.            |
| `PORT`                      | Listen port (Render sets this).                      |

Rotate password:

```bash
node -e "console.log(require('bcryptjs').hashSync('new-password', 10))"
```

…then update `ADMIN_PASSWORD_HASH` in the Render env vars.

## Routes

- `GET /` — overview (KPIs + charts + tables)
- `GET /articles` — content stats
- `GET /live` — realtime list (polls `/api/live` every 5s)
- `GET /settings` — admin settings
- `POST /api/login` — authenticate (public)
- `POST /api/logout`
- `POST /api/beacon` — public CORS endpoint used by `b.js`
- `GET /api/live` — JSON feed for `/live`
- `GET /b.js` — public beacon script

Middleware protects everything except `/login`, `/api/login`, `/api/beacon`, and `/b.js`.

## Sync articles

The articles DB is read-only here and copied from the main site.

```bash
npm run sync-articles
```

For production, run this on a nightly cron (Render job or external).

## Seed data

First `npm run setup` inserts ~300 fake pageviews across the last 7 days so the dashboard has something to show. Purge them with:

```sql
DELETE FROM pageviews WHERE referrer LIKE 'seed://%' OR session_id LIKE 'seed_%';
```
