const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskdrop', {
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    importLocal: () => ipcRenderer.invoke('auth:importLocal'),
    onChanged: (cb) => ipcRenderer.on('auth:changed', (_, data) => cb(data)),
  },
  org: {
    members: () => ipcRenderer.invoke('org:members'),
  },
  sync: {
    now: () => ipcRenderer.invoke('sync:now'),
    onUpdated: (cb) => ipcRenderer.on('sync:updated', () => cb()),
  },
  tasks: {
    getAll: (filter, search, scope) => ipcRenderer.invoke('tasks:getAll', filter, search, scope),
    getById: (id) => ipcRenderer.invoke('tasks:getById', id),
    create: (task) => ipcRenderer.invoke('tasks:create', task),
    update: (id, updates) => ipcRenderer.invoke('tasks:update', id, updates),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    reorder: (ids) => ipcRenderer.invoke('tasks:reorder', ids),
  },
  notes: {
    getByTask: (taskId) => ipcRenderer.invoke('notes:getByTask', taskId),
    create: (taskId, body) => ipcRenderer.invoke('notes:create', taskId, body),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
  },
  reminders: {
    getByTask: (taskId) => ipcRenderer.invoke('reminders:getByTask', taskId),
    create: (reminder) => ipcRenderer.invoke('reminders:create', reminder),
    update: (id, updates) => ipcRenderer.invoke('reminders:update', id, updates),
    delete: (id) => ipcRenderer.invoke('reminders:delete', id),
    snooze: (id, minutes) => ipcRenderer.invoke('reminders:snooze', id, minutes),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    exportCsv: () => ipcRenderer.invoke('settings:exportCsv'),
    clearCompleted: () => ipcRenderer.invoke('settings:clearCompleted'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggle: () => ipcRenderer.invoke('window:toggle'),
  },
  env: {
    getPublic: () => ipcRenderer.invoke('env:getPublic'),
  },
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_, view) => callback(view));
  },
});
