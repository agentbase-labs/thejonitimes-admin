import Link from 'next/link';

export default function Shell({ children, active }: { children: React.ReactNode; active?: string }) {
  const nav = [
    { href: '/', label: 'Overview', key: 'overview' },
    { href: '/articles', label: 'Articles', key: 'articles' },
    { href: '/live', label: 'Live', key: 'live' },
    { href: '/settings', label: 'Settings', key: 'settings' },
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto max-w-pageX px-6 py-4 flex items-end justify-between flex-wrap gap-y-3">
          <div>
            <div className="mast text-3xl md:text-4xl font-semibold leading-none">The Joni Times</div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted mt-1">Admin · Analytics</div>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            {nav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={`py-1 border-b-2 ${active === n.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}
              >
                {n.label}
              </Link>
            ))}
            <form action="/api/logout" method="post">
              <button className="text-xs uppercase tracking-wider text-muted hover:text-ink" type="submit">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-pageX px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-pageX px-6 pb-10 pt-4 text-xs text-faint">
        Private. No external analytics. All data stored on this server.
      </footer>
    </div>
  );
}
