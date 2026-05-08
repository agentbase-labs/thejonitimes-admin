'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const [u, setU] = useState('admin');
  const [p, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    setBusy(false);
    if (r.ok) {
      router.push(next);
      router.refresh();
    } else {
      setErr('Invalid credentials.');
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Username</label>
        <input
          value={u}
          onChange={(e) => setU(e.target.value)}
          autoComplete="username"
          className="w-full border border-rule px-3 py-2 font-sans text-sm focus:outline-none focus:border-ink"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Password</label>
        <input
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          autoComplete="current-password"
          className="w-full border border-rule px-3 py-2 font-sans text-sm focus:outline-none focus:border-ink"
        />
      </div>
      {err && <div className="text-sm text-alert">{err}</div>}
      <button
        disabled={busy}
        className="w-full bg-ink text-white py-2 text-sm uppercase tracking-wider disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mast text-4xl font-semibold">The Joni Times</div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted mt-1">Admin</div>
        </div>
        <Suspense fallback={<div className="card p-6 text-center text-sm text-muted">Loading…</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-xs text-faint text-center mt-6">Authorized personnel only.</p>
      </div>
    </div>
  );
}
