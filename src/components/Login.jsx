import React, { useState } from 'react';

export default function Login({ onAuthenticated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await window.taskdrop.auth.login();
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const unsub = window.taskdrop.auth.onChanged(async (data) => {
      if (data.authenticated) {
        const importResult = await window.taskdrop.auth.importLocal().catch(() => ({ imported: 0 }));
        if (importResult.imported > 0) {
          await window.taskdrop.sync.now();
        }
        onAuthenticated(data);
      }
    });
    return () => {};
  }, [onAuthenticated]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-sidebar bg-td-bg px-6 text-center">
      <span className="text-4xl mb-4">📋</span>
      <h1 className="text-lg font-bold text-td-gold mb-2">TaskDrop</h1>
      <p className="text-td-muted text-sm mb-6">
        Sign in to sync tasks with your team and access cloud features.
      </p>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-td-accent text-white font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Opening browser...' : 'Sign in with TaskDrop'}
      </button>
      {error && <p className="text-td-danger text-xs mt-3">{error}</p>}
      <p className="text-td-muted text-xs mt-6">
        No account? Visit taskdrop.live to sign up.
      </p>
    </div>
  );
}
