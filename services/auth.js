const crypto = require('crypto');
const { shell, safeStorage } = require('electron');
const Store = require('electron-store');
const apiClient = require('./apiClient');

const store = new Store({ name: 'auth' });

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateChallenge(verifier) {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
}

function saveTokens(tokenResponse) {
  const payload = JSON.stringify(tokenResponse);
  if (safeStorage.isEncryptionAvailable()) {
    store.set('tokens', safeStorage.encryptString(payload).toString('base64'));
  } else {
    store.set('tokensPlain', payload);
  }
  store.set('user', tokenResponse.user);
  apiClient.setAccessToken(tokenResponse.accessToken);
}

function getTokens() {
  const encrypted = store.get('tokens');
  if (encrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64')));
    } catch {
      return null;
    }
  }
  const plain = store.get('tokensPlain');
  return plain ? JSON.parse(plain) : null;
}

function getUser() {
  return store.get('user') || getTokens()?.user || null;
}

function isAuthenticated() {
  const tokens = getTokens();
  if (!tokens) return false;
  apiClient.setAccessToken(tokens.accessToken);
  return true;
}

async function refreshIfNeeded() {
  const tokens = getTokens();
  if (!tokens) return false;

  const expiresAt = new Date(tokens.expiresAt);
  if (expiresAt > new Date(Date.now() + 60000)) {
    apiClient.setAccessToken(tokens.accessToken);
    return true;
  }

  try {
    const refreshed = await apiClient.post('/auth/refresh', { refreshToken: tokens.refreshToken });
    saveTokens(refreshed);
    return true;
  } catch {
    logout();
    return false;
  }
}

function logout() {
  store.delete('tokens');
  store.delete('tokensPlain');
  store.delete('user');
  apiClient.setAccessToken(null);
}

async function startLogin() {
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  store.set('pkce_verifier', verifier);

  const portalUrl = process.env.TASKDROP_PORTAL_URL || 'http://localhost:5174';
  const authUrl = `${portalUrl}/desktop-auth?challenge=${encodeURIComponent(challenge)}`;
  await shell.openExternal(`${portalUrl}/login?redirect=${encodeURIComponent('/desktop-auth?challenge=' + encodeURIComponent(challenge))}`);
  return { authUrl, challenge };
}

async function handleCallback(code) {
  const verifier = store.get('pkce_verifier');
  if (!verifier) throw new Error('No PKCE verifier found');

  const os = require('os');
  const tokenResponse = await apiClient.post('/auth/desktop/token', {
    code,
    codeVerifier: verifier,
    deviceName: os.hostname(),
    appVersion: require('../package.json').version,
  });

  store.delete('pkce_verifier');
  saveTokens(tokenResponse);
  return tokenResponse;
}

module.exports = {
  generateVerifier,
  generateChallenge,
  saveTokens,
  getTokens,
  getUser,
  isAuthenticated,
  refreshIfNeeded,
  logout,
  startLogin,
  handleCallback,
};
