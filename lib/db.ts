import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Resolve DB paths relative to project root. During `next start` CWD is project root.
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const ANALYTICS_DB_PATH = path.join(DATA_DIR, 'analytics.db');
const ARTICLES_DB_PATH = path.join(DATA_DIR, 'articles.db');

let _analytics: Database.Database | null = null;
let _articles: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initAnalyticsSchema(db: Database.Database) {
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
}

export function analytics(): Database.Database {
  if (_analytics) return _analytics;
  ensureDataDir();
  _analytics = new Database(ANALYTICS_DB_PATH);
  _analytics.pragma('journal_mode = WAL');
  initAnalyticsSchema(_analytics);
  return _analytics;
}

export function articles(): Database.Database | null {
  if (_articles) return _articles;
  if (!fs.existsSync(ARTICLES_DB_PATH)) return null;
  _articles = new Database(ARTICLES_DB_PATH, { readonly: true, fileMustExist: true });
  return _articles;
}

export type Article = {
  id: number;
  slug: string;
  headline: string;
  subheadline: string;
  topic: string;
  published_at: string;
  author: string;
  language: string;
  hero_rank: number | null;
  image_path: string | null;
};

export function allArticles(): Article[] {
  const db = articles();
  if (!db) return [];
  return db.prepare(`
    SELECT id, slug, headline, subheadline, topic, published_at, author, language, hero_rank, image_path
    FROM articles
    ORDER BY datetime(published_at) DESC
  `).all() as Article[];
}

export function articleBySlug(slug: string): Article | null {
  const db = articles();
  if (!db) return null;
  return (db.prepare(`
    SELECT id, slug, headline, subheadline, topic, published_at, author, language, hero_rank, image_path
    FROM articles WHERE slug = ?
  `).get(slug) as Article | undefined) || null;
}
