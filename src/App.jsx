import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import Login from './components/Login';

export default function App() {
  const [view, setView] = useState('sidebar');
  const [theme, setTheme] = useState('dark');
  const [authState, setAuthState] = useState({ loading: true, authenticated: false, user: null });

  useEffect(() => {
    window.taskdrop?.settings.get().then((s) => {
      setTheme(s.theme || 'dark');
      document.documentElement.classList.toggle('dark', s.theme !== 'light');
    });

    window.taskdrop?.auth.status().then((status) => {
      setAuthState({ loading: false, authenticated: status.authenticated, user: status.user });
    });

    window.taskdrop?.onNavigate((v) => setView(v));
    window.taskdrop?.auth.onChanged((data) => {
      setAuthState({ loading: false, authenticated: data.authenticated, user: data.user });
    });
    window.taskdrop?.sync.onUpdated(() => {
      window.dispatchEvent(new Event('taskdrop-sync'));
    });
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme !== 'light');
  };

  if (authState.loading) {
    return (
      <div className="flex items-center justify-center h-full w-sidebar bg-td-bg text-td-muted text-sm">
        Loading...
      </div>
    );
  }

  if (!authState.authenticated && view !== 'settings') {
    return <Login onAuthenticated={(data) => setAuthState({ loading: false, authenticated: true, user: data.user })} />;
  }

  if (view === 'settings') {
    return (
      <Settings
        theme={theme}
        onThemeChange={handleThemeChange}
        onBack={() => setView('sidebar')}
        user={authState.user}
      />
    );
  }

  return (
    <Sidebar
      theme={theme}
      user={authState.user}
      onOpenSettings={() => setView('settings')}
    />
  );
}
