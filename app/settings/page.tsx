import Shell from '../../components/Shell';
import { passwordHash, rotatedAt } from '../../lib/auth';

export const dynamic = 'force-dynamic';

function mask(h: string) {
  if (!h) return '—';
  return h.slice(0, 7) + '…' + h.slice(-6);
}

export default async function SettingsPage() {
  const h = passwordHash();
  const rot = rotatedAt();
  return (
    <Shell active="settings">
      <h1 className="mast text-2xl font-semibold mb-6">Settings</h1>

      <div className="card p-5 mb-6">
        <h2 className="mast text-lg font-semibold mb-3">Admin credentials</h2>
        <div className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <div className="text-muted">Username</div>
          <div className="num">admin</div>
          <div className="text-muted">Password hash</div>
          <div className="num text-xs">{mask(h)}</div>
          <div className="text-muted">Last rotated</div>
          <div className="num">{rot}</div>
        </div>
        <div className="mt-5 text-xs text-faint border-t border-rule pt-3 leading-relaxed">
          To rotate the password:<br />
          <span className="font-mono text-[11px]">
            {`node -e "console.log(require('bcryptjs').hashSync('NEW-PW', 10))"`}
          </span><br />
          then set <code className="font-mono">ADMIN_PASSWORD_HASH</code> (and{' '}
          <code className="font-mono">ADMIN_PASSWORD_ROTATED_AT</code>) in the Render service env vars.
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="mast text-lg font-semibold mb-3">Data</h2>
        <ul className="text-sm space-y-2">
          <li className="text-muted">
            Pageviews stored at <code className="font-mono text-xs">data/analytics.db</code> (SQLite, WAL mode).
          </li>
          <li className="text-muted">
            Articles mirror at <code className="font-mono text-xs">data/articles.db</code> (read-only, synced nightly).
          </li>
          <li className="text-muted">
            Sync manually with{' '}
            <code className="font-mono text-xs">npm run sync-articles</code>.
          </li>
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="mast text-lg font-semibold mb-3">Beacon</h2>
        <p className="text-sm text-muted">
          Install on the public site by adding this tag to each layout, just before <code>&lt;/body&gt;</code>:
        </p>
        <pre className="mt-3 font-mono text-xs bg-[#f7f5ee] border border-rule p-3 overflow-x-auto">
{`<script async src="https://admin.thejonitimes.com/b.js"></script>`}
        </pre>
      </div>
    </Shell>
  );
}
