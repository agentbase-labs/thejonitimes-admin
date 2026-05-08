import Shell from '../components/Shell';
import { DailyLine, HourlyBars, DeviceDonut } from '../components/Charts';
import {
  kpis, pageviewsByDay, pageviewsByHourToday,
  topCountries, deviceSplit, topArticlesSafe, recentReferrers,
} from '../lib/queries';
import { flag, countryName } from '../lib/flags';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(n: number) { return n.toLocaleString('en-US'); }

function startOfTodayUTC(): number {
  const d = new Date();
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="kpi p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="num text-3xl md:text-4xl font-medium mt-2">{value}</div>
      {sub && <div className="text-xs text-faint mt-1">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="mast text-xl font-semibold">{children}</h2>
      {note && <span className="text-xs text-faint">{note}</span>}
    </div>
  );
}

export default async function HomePage() {
  const k = kpis();
  const daily = pageviewsByDay(30);
  const hourly = pageviewsByHourToday();
  const countries = topCountries(10);
  const devices = deviceSplit();
  const topAll = topArticlesSafe(10);
  const topToday = topArticlesSafe(10, startOfTodayUTC());
  const referrers = recentReferrers(20);

  const maxCountry = countries[0]?.n || 1;
  const maxTopAll = topAll[0]?.n || 1;
  const maxTopToday = topToday[0]?.n || 1;

  return (
    <Shell active="overview">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi label="Total pageviews" value={num(k.total)} sub="all-time" />
        <Kpi label="Pageviews today" value={num(k.today)} sub="since 00:00 UTC" />
        <Kpi label="Unique visitors today" value={num(k.uniqueToday)} sub="distinct sessions" />
        <Kpi label="Active readers" value={num(k.active15)} sub="last 15 min" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-4">
          <SectionTitle note="last 30 days, UTC">Pageviews — daily</SectionTitle>
          <DailyLine data={daily} />
        </div>
        <div className="card p-4">
          <SectionTitle note="today, UTC">Pageviews — by hour</SectionTitle>
          <HourlyBars data={hourly} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-4">
          <SectionTitle note="all-time">Top 10 countries</SectionTitle>
          {countries.length === 0 ? (
            <div className="text-sm text-faint p-4">No data yet.</div>
          ) : (
            <div className="space-y-2">
              {countries.map((c) => {
                const pct = Math.round((c.n / maxCountry) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-center text-base leading-none">{flag(c.country)}</span>
                    <span className="w-32 md:w-40 truncate">{countryName(c.country)}</span>
                    <div className="flex-1 h-2 bg-[#f0f0f0] relative">
                      <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="num text-xs w-14 text-right">{num(c.n)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card p-4">
          <SectionTitle note="all-time">Device split</SectionTitle>
          {devices.length === 0 ? (
            <div className="text-sm text-faint p-4">No data yet.</div>
          ) : (
            <>
              <DeviceDonut data={devices} />
              <div className="flex flex-wrap gap-4 justify-center text-xs mt-2">
                {devices.map((d, i) => (
                  <div key={d.device} className="flex items-center gap-1">
                    <span
                      className="inline-block w-3 h-3"
                      style={{ background: ['#111', '#c0392b', '#999', '#555'][i % 4] }}
                    />
                    <span className="capitalize">{d.device}</span>
                    <span className="num text-muted">{num(d.n)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top articles tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ArticleTable title="Top 10 articles — all-time" rows={topAll} max={maxTopAll} />
        <ArticleTable title="Top 10 articles — today" rows={topToday} max={maxTopToday} />
      </div>

      {/* Referrers */}
      <div className="card p-4 mb-8">
        <SectionTitle note="last 20, by count">Top referrers</SectionTitle>
        {referrers.length === 0 ? (
          <div className="text-sm text-faint p-4">No referrer data yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {referrers.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#f0f0f0] text-sm">
                <span className="truncate mr-3" title={r.referrer}>{r.host}</span>
                <span className="num text-muted">{num(r.n)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function ArticleTable({
  title, rows, max,
}: {
  title: string;
  rows: { slug: string; headline: string; topic: string; n: number }[];
  max: number;
}) {
  return (
    <div className="card p-4">
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <div className="text-sm text-faint p-4">No data yet.</div>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_auto] gap-3 text-[10px] uppercase tracking-[0.15em] text-faint pb-2 border-b border-rule">
            <div>Article</div>
            <div className="text-right">Views</div>
          </div>
          {rows.map((r) => {
            const pct = Math.round((r.n / max) * 100);
            return (
              <div key={r.slug} className="py-2.5 border-b border-[#f3f3f3] last:border-0">
                <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                  <div className="min-w-0">
                    <div className="text-sm leading-snug truncate">{r.headline}</div>
                    <div className="text-[10px] uppercase tracking-wider text-faint mt-0.5">
                      {r.topic} · <span className="font-mono">{r.slug}</span>
                    </div>
                  </div>
                  <div className="num text-sm tabular-nums text-right">{r.n.toLocaleString('en-US')}</div>
                </div>
                <div className="h-1 bg-[#f3f3f3] mt-1.5">
                  <div className="h-1 bg-ink" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
