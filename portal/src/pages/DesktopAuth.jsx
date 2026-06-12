import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';

function generateVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function DesktopAuth() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('Checking login...');
  const challenge = params.get('challenge');
  const state = params.get('state');

  useEffect(() => {
    async function authorize() {
      if (!challenge) {
        setStatus('Missing PKCE challenge.');
        return;
      }

      const token = localStorage.getItem('taskdrop_token');
      if (!token) {
        setStatus('Please log in first, then return to the desktop app.');
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }

      try {
        const result = await api.createDesktopCode({ codeChallenge: challenge });
        setStatus('Authorization complete! Return to TaskDrop.');
        window.location.href = result.redirect || `taskdrop://auth/callback?code=${result.code}&state=${state || ''}`;
      } catch (err) {
        setStatus(`Error: ${err.message}`);
      }
    }
    authorize();
  }, [challenge, state]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-td-gold mb-4">Connecting to TaskDrop</h1>
      <p className="text-td-muted">{status}</p>
    </div>
  );
}

export { generateVerifier, sha256Base64Url };
