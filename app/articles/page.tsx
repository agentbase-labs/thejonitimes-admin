import Shell from '../../components/Shell';
import { articleStats } from '../../lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(n: number) { return n.toLocaleString('en-US'); }

function langSlug(a: { slug: string; language: string }) {
  // The main site uses /article/<slug>/ for EN, /he/article/<slug>/, /ar/article/<slug>/ for other langs
  const lang = (a.language || 'en').toLowerCase();
  if (lang === 'he') return `/he/article/${a.slug}/`;
  if (lang === 'ar') return `/ar/article/${a.slug}/`;
  return `/article/${a.slug}/`;
}

export default async function ArticlesPage() {
  const rows = articleStats();
  const total = rows.length;
  const byTopic: Record<string, number> = {};
  for (const r of rows) byTopic[r.topic] = (byTopic[r.topic] || 0) + 1;
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const todayCount = rows.filter((r) => now - new Date(r.published_at).getTime() < day).length;
  const weekCount = rows.filter((r) => now - new Date(r.published_at).getTime() < 7 * day).length;
  const heroes = rows.filter((r) => r.hero_rank != null).length;

  return (
    <Shell active="articles">
      <h1 className="mast text-2xl font-semibold mb-6">Content</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Stat label="Total articles" value={total} />
        <Stat label="Topics" value={Object.keys(byTopic).length} />
        <Stat label="Published today" value={todayCount} />
        <Stat label="Published 7d" value={weekCount} />
        <Stat label="On hero" value={heroes} />
      </div>

      <div className="card p-4 mb-8">
        <h2 className="mast text-lg font-semibold mb-3">By topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          {Object.entries(byTopic).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
            <div key={t} className="flex items-center justify-between border border-rule px-3 py-2">
              <span className="capitalize">{t}</span>
              <span className="num text-muted">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-rule">
          <h2 className="mast text-lg font-semibold">All articles</h2>
          <p className="text-xs text-faint mt-1">Sorted by publish date (newest first). Click a row to open the live article.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-faint border-b border-rule">
                <th className="text-left px-4 py-2 font-normal">Published</th>
                <th className="text-left px-4 py-2 font-normal">Topic</th>
                <th className="text-left px-4 py-2 font-normal">Lang</th>
                <th className="text-left px-4 py-2 font-normal">Headline</th>
                <th className="text-left px-4 py-2 font-normal">Slug</th>
                <th className="text-right px-4 py-2 font-normal">Views all-time</th>
                <th className="text-right px-4 py-2 font-normal">Views today</th>
                <th className="text-center px-4 py-2 font-normal">Hero</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#f3f3f3] hover:bg-[#faf8f3]">
                  <td className="px-4 py-2 num text-xs whitespace-nowrap text-muted">{r.published_at.slice(0, 10)}</td>
                  <td className="px-4 py-2 capitalize text-muted">{r.topic}</td>
                  <td className="px-4 py-2 text-xs uppercase text-muted">{r.language}</td>
                  <td className="px-4 py-2">
                    <a href={`https://thejonitimes.com${langSlug(r)}`} target="_blank" rel="noopener" className="hover:text-alert">
                      {r.headline}
                    </a>
                  </td>
                  <td className="px-4 py-2 num text-xs text-faint">{r.slug}</td>
                  <td className="px-4 py-2 num text-right">{num(r.views_total)}</td>
                  <td className="px-4 py-2 num text-right">{num(r.views_today)}</td>
                  <td className="px-4 py-2 text-center text-xs">{r.hero_rank != null ? `#${r.hero_rank}` : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-faint">No articles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="kpi p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="num text-2xl font-medium mt-1">{value.toLocaleString('en-US')}</div>
    </div>
  );
}
