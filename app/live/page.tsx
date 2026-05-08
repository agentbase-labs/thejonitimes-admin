'use client';
import Shell from '../../components/Shell';
import { useEffect, useRef, useState } from 'react';

type Row = {
  id: number;
  ts: number;
  path: string;
  slug: string | null;
  headline?: string;
  country: string;
  device: string;
  browser: string;
  lang: string;
  referrer?: string;
};

function flag(cc: string): string {
  if (!cc || cc.length !== 2) return '🏳️';
  const a = cc.toUpperCase().charCodeAt(0);
  const b = cc.toUpperCase().charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return '🏳️';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (a - 65)) + String.fromCodePoint(base + (b - 65));
}

function timeAgo(ts: number) {
  const d = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function LivePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [kp, setKp] = useState<{ total: number; today: number; uniqueToday: number; active15: number } | null>(null);
  const lastId = useRef(0);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  async function tick() {
    try {
      const r = await fetch('/api/live', { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) {
        const fresh: number[] = [];
        for (const row of j.recent) if (row.id > lastId.current) fresh.push(row.id);
        if (j.recent[0]) lastId.current = Math.max(lastId.current, j.recent[0].id);
        setRows(j.recent);
        setKp(j.kpis);
        if (fresh.length) {
          setNewIds(new Set(fresh));
          setTimeout(() => setNewIds(new Set()), 1500);
        }
      }
    } catch {}
  }

  useEffect(() => {
    tick();
    const h = setInterval(tick, 5000);
    return () => clearInterval(h);
  }, []);

  return (
    <Shell active="live">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="mast text-2xl font-semibold">Live</h1>
          <p className="text-xs text-faint mt-1">Auto-refresh every 5 seconds. Last 30 pageviews.</p>
        </div>
        {kp && (
          <div className="flex gap-6 text-xs text-muted">
            <span>Active now: <b className="text-ink num">{kp.active15}</b></span>
            <span>Today: <b className="text-ink num">{kp.today}</b></span>
            <span>Total: <b className="text-ink num">{kp.total}</b></span>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[80px_40px_80px_1fr_80px] gap-3 px-4 py-2 border-b border-rule text-[10px] uppercase tracking-[0.15em] text-faint">
          <div>When</div>
          <div></div>
          <div>Device</div>
          <div>Path</div>
          <div className="text-right">Lang</div>
        </div>
        {rows.length === 0 && (
          <div className="p-8 text-center text-faint text-sm">Waiting for pageviews…</div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className={`grid grid-cols-[80px_40px_80px_1fr_80px] gap-3 px-4 py-2.5 border-b border-[#f3f3f3] text-sm items-center ${newIds.has(r.id) ? 'pulse' : ''}`}
          >
            <div className="num text-xs text-muted">{timeAgo(r.ts)} ago</div>
            <div className="text-xl leading-none" title={r.country}>{flag(r.country)}</div>
            <div className="text-xs text-muted capitalize">{r.device}</div>
            <div className="min-w-0">
              <div className="truncate">{r.headline || r.path}</div>
              <div className="text-[10px] text-faint font-mono truncate">{r.path}</div>
            </div>
            <div className="text-right text-xs uppercase text-muted">{r.lang}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
