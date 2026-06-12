import React, { useEffect, useState } from 'react';

export default function Settings({ theme, onThemeChange, onBack, user }) {
  const [settings, setSettings] = useState(null);
  const [envStatus, setEnvStatus] = useState({});
  const [syncStatus, setSyncStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      window.taskdrop.settings.get(),
      window.taskdrop.env.getPublic(),
      window.taskdrop.auth.status(),
    ]).then(([s, env, auth]) => {
      setSettings(s);
      setEnvStatus(env);
      setSyncStatus(auth.sync);
    });
  }, []);

  const update = async (key, value) => {
    await window.taskdrop.settings.set(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'theme') onThemeChange(value);
  };

  const handleExport = async () => {
    const result = await window.taskdrop.settings.exportCsv();
    if (result.success) {
      setMessage(`Exported to ${result.filePath}`);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all completed and archived tasks?')) {
      const result = await window.taskdrop.settings.clearCompleted();
      setMessage(`Removed ${result.deleted} tasks.`);
    }
  };

  const handleLogout = async () => {
    await window.taskdrop.auth.logout();
    window.location.reload();
  };

  const handleSync = async () => {
    await window.taskdrop.sync.now();
    setMessage('Sync complete.');
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full text-td-muted text-sm">
        Loading settings...
      </div>
    );
  }

  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col h-full w-sidebar ${isLight ? 'bg-gray-50 text-gray-900' : 'bg-td-bg text-td-text'}`}>
      <header className={`flex items-center gap-2 px-3 py-3 border-b shrink-0 ${isLight ? 'border-gray-200 bg-white' : 'border-td-border bg-td-surface'}`}>
        <button type="button" onClick={onBack} className="text-td-accent hover:underline text-sm">← Back</button>
        <h1 className="text-sm font-bold text-td-gold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        {user && (
          <section>
            <h2 className="text-xs font-semibold uppercase text-td-muted mb-3">Account</h2>
            <p className="text-sm">{user.firstName} {user.lastName}</p>
            <p className="text-td-muted text-xs">{user.email}</p>
            <p className="text-td-muted text-xs mt-1">{user.organizationName} · {user.role}</p>
            {syncStatus && (
              <p className="text-xs mt-2 capitalize">
                Subscription: {syncStatus.subscriptionStatus || 'unknown'}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={handleSync}
                className="px-3 py-1.5 rounded border border-td-border hover:border-td-accent text-xs">
                Sync now
              </button>
              <button type="button" onClick={handleLogout}
                className="px-3 py-1.5 rounded border border-td-danger/50 text-td-danger text-xs hover:bg-td-danger/10">
                Sign out
              </button>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase text-td-muted mb-3">Appearance</h2>
          <div className="flex gap-2">
            {['dark', 'light'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('theme', t)}
                className={`px-3 py-1.5 rounded capitalize ${
                  settings.theme === t
                    ? 'bg-td-accent text-white'
                    : 'border border-td-border text-td-muted hover:border-td-accent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase text-td-muted mb-3">Window</h2>
          <label className="flex items-center justify-between py-2">
            <span>Always on top</span>
            <input
              type="checkbox"
              checked={settings.alwaysOnTop}
              onChange={(e) => update('alwaysOnTop', e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between py-2">
            <span>Launch on Windows startup</span>
            <input
              type="checkbox"
              checked={settings.launchOnStartup}
              onChange={(e) => update('launchOnStartup', e.target.checked)}
            />
          </label>
          <div className="py-2">
            <label className="block text-td-muted text-xs mb-1">Global hotkey</label>
            <input
              type="text"
              value={settings.hotkey}
              onChange={(e) => update('hotkey', e.target.value)}
              onBlur={(e) => update('hotkey', e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-td-border bg-td-surface text-sm"
              placeholder="Control+Shift+T"
            />
            <p className="text-xs text-td-muted mt-1">Default: Ctrl+Shift+T</p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase text-td-muted mb-3">Reminders</h2>
          <div className="py-2">
            <label className="block text-td-muted text-xs mb-1">Default lead time (minutes)</label>
            <input
              type="number"
              min="1"
              value={settings.defaultReminderMinutes}
              onChange={(e) => update('defaultReminderMinutes', parseInt(e.target.value, 10) || 30)}
              className="w-full px-2 py-1.5 rounded border border-td-border bg-td-surface text-sm"
            />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase text-td-muted mb-3">Integrations</h2>
          <p className="text-xs text-td-muted mb-2">
            API keys are stored in <code className="text-td-accent">.env</code> in the project root (never in the app UI).
          </p>
          <div className="space-y-1 text-xs">
            <p>
              Twilio SMS:{' '}
              <span className={envStatus.twilioConfigured ? 'text-td-success' : 'text-td-warning'}>
                {envStatus.twilioConfigured ? 'Configured' : 'Not configured'}
              </span>
            </p>
            <p>
              SendGrid Email:{' '}
              <span className={envStatus.sendgridConfigured ? 'text-td-success' : 'text-td-warning'}>
                {envStatus.sendgridConfigured ? 'Configured' : 'Not configured'}
              </span>
            </p>
          </div>
          <p className="text-xs text-td-muted mt-2">
            Copy <code>.env.example</code> to <code>.env</code> and add your credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase text-td-muted mb-3">Data</h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 rounded border border-td-border hover:border-td-accent text-left"
            >
              Export all tasks to CSV
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded border border-td-danger/50 text-td-danger hover:bg-td-danger/10 text-left"
            >
              Clear completed & archived tasks
            </button>
          </div>
        </section>

        {message && (
          <p className="text-xs text-td-success bg-td-success/10 rounded p-2">{message}</p>
        )}
      </div>
    </div>
  );
}
