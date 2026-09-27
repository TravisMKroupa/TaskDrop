const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  screen,
  ipcMain,
  nativeImage,
  dialog,
} = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
require('dotenv').config();

const db = require('./services/db');
const auth = require('./services/auth');
const syncService = require('./services/syncService');
const { startScheduler, stopScheduler } = require('./services/scheduler');

const store = new Store({
  defaults: {
    theme: 'dark',
    alwaysOnTop: true,
    launchOnStartup: false,
    hotkey: 'Control+Shift+T',
    defaultReminderMinutes: 30,
    categories: ['Work', 'Personal', 'Event', 'Finance', 'Other'],
    snoozeReminders: false,
    taskScope: 'all',
  },
});

let win = null;
let tray = null;
let isQuitting = false;

const SIDEBAR_WIDTH = 340;
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('taskdrop', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('taskdrop');
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  if (fs.existsSync(iconPath)) return nativeImage.createFromPath(iconPath);
  return nativeImage.createEmpty();
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const alwaysOnTop = store.get('alwaysOnTop');

  win = new BrowserWindow({
    width: SIDEBAR_WIDTH,
    height,
    x: width - SIDEBAR_WIDTH,
    y: 0,
    frame: false,
    resizable: false,
    alwaysOnTop,
    skipTaskbar: false,
    show: true,
    backgroundColor: '#0F0F1A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  global.mainWindow = win;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function registerHotkey(accelerator) {
  globalShortcut.unregisterAll();
  try {
    globalShortcut.register(accelerator, toggleWindow);
  } catch (err) {
    console.error('[TaskDrop] Failed to register hotkey:', err.message);
  }
}

function toggleWindow() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else { win.show(); win.focus(); }
}

function buildTrayMenu() {
  const snoozed = store.get('snoozeReminders');
  return Menu.buildFromTemplate([
    { label: 'Open TaskDrop', click: () => { win?.show(); win?.focus(); } },
    {
      label: snoozed ? 'Resume Reminders' : 'Snooze Reminders (1 hr)',
      click: () => { store.set('snoozeReminders', !snoozed); buildTray(); },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => { win?.show(); win?.focus(); win?.webContents.send('navigate', 'settings'); },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
}

function buildTray() {
  if (!tray) {
    tray = new Tray(getTrayIcon());
    tray.setToolTip('TaskDrop');
    tray.on('double-click', () => { win?.show(); win?.focus(); });
  }
  tray.setContextMenu(buildTrayMenu());
}

function setupStartup() {
  app.setLoginItemSettings({
    openAtLogin: store.get('launchOnStartup'),
    path: process.execPath,
    args: isDev ? [path.resolve(process.argv[1])] : [],
  });
}

async function handleProtocolUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'auth' && parsed.pathname === '/callback') {
      const code = parsed.searchParams.get('code');
      if (code) {
        await auth.handleCallback(code);
        await syncService.fullSync();
        await syncService.initSignalR();
        win?.webContents.send('auth:changed', { authenticated: true, user: auth.getUser() });
        win?.show();
        win?.focus();
      }
    }
  } catch (err) {
    console.error('[TaskDrop] Protocol handler error:', err.message);
  }
}

function registerIpc() {
  ipcMain.handle('auth:status', async () => ({
    authenticated: auth.isAuthenticated(),
    user: auth.getUser(),
    sync: await syncService.getSyncStatus().catch(() => ({})),
  }));
  ipcMain.handle('auth:login', async () => auth.startLogin());
  ipcMain.handle('auth:logout', async () => {
    auth.logout();
    win?.webContents.send('auth:changed', { authenticated: false });
  });
  ipcMain.handle('auth:importLocal', () => syncService.importLocalToCloud());
  ipcMain.handle('org:members', () => syncService.getOrgMembers());

  ipcMain.handle('tasks:getAll', (_, filter, search, scope) =>
    syncService.getAllTasks(filter, search, scope || store.get('taskScope')));
  ipcMain.handle('tasks:getById', (_, id) => db.getTaskById(id));
  ipcMain.handle('tasks:create', (_, task) => syncService.createTask(task));
  ipcMain.handle('tasks:update', (_, id, updates) => syncService.updateTask(id, updates));
  ipcMain.handle('tasks:delete', (_, id) => syncService.deleteTask(id));
  ipcMain.handle('tasks:reorder', (_, ids) => db.reorderTasks(ids));

  ipcMain.handle('notes:getByTask', (_, taskId) => db.getNotesByTaskId(taskId));
  ipcMain.handle('notes:create', (_, taskId, body) => syncService.createNote(taskId, body));
  ipcMain.handle('notes:delete', (_, id) => db.deleteNote(id));

  ipcMain.handle('reminders:getByTask', (_, taskId) => db.getRemindersByTaskId(taskId));
  ipcMain.handle('reminders:create', (_, reminder) => syncService.createReminder(reminder));
  ipcMain.handle('reminders:update', (_, id, updates) => db.updateReminder(id, updates));
  ipcMain.handle('reminders:delete', (_, id) => db.deleteReminder(id));
  ipcMain.handle('reminders:snooze', (_, id, minutes) => db.snoozeReminder(id, minutes));

  ipcMain.handle('sync:now', () => syncService.fullSync());

  ipcMain.handle('settings:get', () => store.store);
  ipcMain.handle('settings:set', (_, key, value) => {
    store.set(key, value);
    if (key === 'alwaysOnTop' && win) win.setAlwaysOnTop(value);
    if (key === 'launchOnStartup') setupStartup();
    if (key === 'hotkey') registerHotkey(value);
    return store.get(key);
  });
  ipcMain.handle('settings:exportCsv', async () => {
    const csv = db.exportTasksToCsv();
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Export Tasks',
      defaultPath: 'taskdrop-export.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, csv, 'utf8');
    return { success: true, filePath };
  });
  ipcMain.handle('settings:clearCompleted', () => db.clearCompletedAndArchived());

  ipcMain.handle('window:minimize', () => win?.hide());
  ipcMain.handle('window:toggle', () => toggleWindow());

  ipcMain.handle('env:getPublic', () => ({
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('your_')),
    sendgridConfigured: !!(process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.startsWith('your_')),
    apiUrl: process.env.TASKDROP_API_URL || (app.isPackaged ? 'https://taskdrop.live/api' : 'http://localhost:5000/api'),
    portalUrl: process.env.TASKDROP_PORTAL_URL || (app.isPackaged ? 'https://taskdrop.live' : 'http://localhost:5174'),
  }));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_, argv) => {
    const url = argv.find((a) => a.startsWith('taskdrop://'));
    if (url) handleProtocolUrl(url);
    win?.show();
    win?.focus();
  });
}

app.whenReady().then(async () => {
  db.getDb();
  auth.isAuthenticated();
  createWindow();
  buildTray();
  setupStartup();
  registerHotkey(store.get('hotkey'));
  registerIpc();
  startScheduler();

  if (auth.isAuthenticated()) {
    await syncService.fullSync().catch(console.error);
    await syncService.initSignalR().catch(console.error);
  }

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else win?.show();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopScheduler();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
