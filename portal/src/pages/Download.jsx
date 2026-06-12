import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Download() {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    api.getLatestRelease().then(setRelease).catch(() =>
      setRelease({ version: '1.0.0', url: '/download/TaskDrop-Setup.exe', releaseNotes: 'TaskDrop for Windows' })
    );
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <h1 className="text-3xl font-bold text-td-gold mb-4">Download TaskDrop</h1>
      <p className="text-td-muted mb-8">
        Windows 10/11 · Sidebar productivity app · Requires an account
      </p>

      {release && (
        <div className="p-8 rounded-xl bg-td-surface border border-td-border">
          <p className="text-td-muted text-sm mb-2">Latest version</p>
          <p className="text-2xl font-bold mb-4">v{release.version}</p>
          <a href={release.url}
            className="inline-block px-8 py-3 rounded-lg bg-td-accent text-white font-medium hover:opacity-90">
            Download for Windows
          </a>
          <p className="text-td-muted text-sm mt-4">{release.releaseNotes}</p>
        </div>
      )}

      <div className="mt-8 text-left text-sm text-td-muted space-y-2">
        <p>1. Download and run the installer</p>
        <p>2. Launch TaskDrop from your system tray</p>
        <p>3. Sign in with your TaskDrop account</p>
        <p>4. Press Ctrl+Shift+T to toggle the sidebar</p>
      </div>
    </div>
  );
}
