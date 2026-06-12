const auth = require('./auth');
const apiClient = require('./apiClient');
const db = require('./db');

let lastSyncAt = null;
let deviceId = null;
let syncInProgress = false;
let hubConnection = null;

function mapApiTaskToLocal(t) {
  return {
    server_id: t.id,
    title: t.title,
    due_date: t.dueDate,
    priority: t.priority,
    category: t.category,
    status: t.status.toLowerCase(),
    sort_order: t.sortOrder,
    assigned_to_user_id: t.assignedToUserId,
    assigned_to_name: t.assignedToName,
    updated_at: t.updatedAt,
  };
}

async function pull() {
  if (!auth.isAuthenticated()) return { synced: false };
  await auth.refreshIfNeeded();

  const since = lastSyncAt || db.getLastSyncTime();
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const data = await apiClient.get(`/sync/pull${query}`);

  db.mergeSyncData(data);
  lastSyncAt = data.serverTime;
  db.setLastSyncTime(data.serverTime);

  return { synced: true, ...data };
}

async function pushPending() {
  if (!auth.isAuthenticated()) return;
  const pending = db.getPendingChanges();
  if (pending.tasksCreated.length === 0 && pending.tasksUpdated.length === 0 &&
      pending.tasksDeleted.length === 0) return;

  await apiClient.post('/sync/push', {
    ...pending,
    deviceId,
    deviceName: require('os').hostname(),
    appVersion: require('../package.json').version,
  });

  db.clearPendingFlags();
}

async function fullSync() {
  if (syncInProgress || !auth.isAuthenticated()) return { synced: false };
  syncInProgress = true;
  try {
    await auth.refreshIfNeeded();
    await pushPending();
    const result = await pull();
    const status = await apiClient.get('/sync/status');
    deviceId = status.deviceId;
    notifyRenderer();
    return result;
  } finally {
    syncInProgress = false;
  }
}

function notifyRenderer() {
  if (global.mainWindow) {
    global.mainWindow.webContents.send('sync:updated');
  }
}

async function initSignalR() {
  if (!auth.isAuthenticated()) return;
  try {
    const signalR = require('@microsoft/signalr');
    const baseUrl = (process.env.TASKDROP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const tokens = auth.getTokens();

    if (hubConnection) {
      await hubConnection.stop();
    }

    hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/sync`, {
        accessTokenFactory: () => tokens?.accessToken || '',
      })
      .withAutomaticReconnect()
      .build();

    hubConnection.on('DataChanged', () => {
      fullSync().catch(console.error);
    });

    await hubConnection.start();
  } catch (err) {
    console.warn('[TaskDrop] SignalR connect failed:', err.message);
  }
}

async function createTask(task) {
  const local = db.createTask({ ...task, pending_sync: 1 });
  if (auth.isAuthenticated()) {
    try {
      const created = await apiClient.post('/tasks', {
        title: task.title,
        dueDate: task.due_date,
        priority: task.priority || 'Medium',
        category: task.category || 'Personal',
        assignedToUserId: task.assigned_to_user_id || null,
      });
      db.updateTaskLocalId(local.id, created.id, created);
      await fullSync();
    } catch (err) {
      db.queuePendingTask(local.id);
      throw err;
    }
  }
  return db.getTaskById(local.id);
}

async function updateTask(id, updates) {
  const task = db.updateTask(id, { ...updates, pending_sync: 1 });
  if (auth.isAuthenticated() && task.server_id) {
    try {
      await apiClient.put(`/tasks/${task.server_id}`, {
        title: updates.title,
        dueDate: updates.due_date,
        priority: updates.priority,
        category: updates.category,
        status: updates.status ? updates.status.charAt(0).toUpperCase() + updates.status.slice(1) : undefined,
        assignedToUserId: updates.assigned_to_user_id,
        sortOrder: updates.sort_order,
      });
      await fullSync();
    } catch {
      db.queuePendingTask(id);
    }
  }
  return db.getTaskById(id);
}

async function deleteTask(id) {
  const task = db.getTaskById(id);
  db.deleteTask(id);
  if (auth.isAuthenticated() && task?.server_id) {
    try {
      await apiClient.delete(`/tasks/${task.server_id}`);
      await fullSync();
    } catch {
      db.queuePendingDelete(id);
    }
  }
  return { success: true };
}

async function getAllTasks(filter, search, scope) {
  if (auth.isAuthenticated()) {
    try {
      await fullSync();
      const params = new URLSearchParams();
      if (filter) params.set('filter', filter);
      if (search) params.set('search', search);
      if (scope) params.set('scope', scope);
      const remote = await apiClient.get(`/tasks?${params}`);
      db.replaceTasksFromRemote(remote);
    } catch (err) {
      console.warn('[TaskDrop] Remote fetch failed, using cache:', err.message);
    }
  }
  return db.getAllTasks(filter, search, scope);
}

async function createNote(taskId, body) {
  const note = db.createNote(taskId, body);
  const task = db.getTaskById(taskId);
  if (auth.isAuthenticated() && task?.server_id) {
    try {
      await apiClient.post(`/tasks/${task.server_id}/notes`, { body });
      await fullSync();
    } catch {
      /* cached locally */
    }
  }
  return note;
}

async function createReminder(reminder) {
  const local = db.createReminder(reminder);
  const task = db.getTaskById(reminder.task_id);
  if (auth.isAuthenticated() && task?.server_id) {
    try {
      await apiClient.post(`/tasks/${task.server_id}/reminders`, {
        fireAt: reminder.fire_at,
        typeToast: !!reminder.type_toast,
        typeSms: !!reminder.type_sms,
        typeEmail: !!reminder.type_email,
        recurring: reminder.recurring || 'none',
      });
      await fullSync();
    } catch {
      /* cached locally */
    }
  }
  return local;
}

async function importLocalToCloud() {
  if (!auth.isAuthenticated()) return { imported: 0 };
  const localTasks = db.getAllTasks('all', '', 'all').filter((t) => !t.server_id);
  if (localTasks.length === 0) return { imported: 0 };

  await apiClient.post('/tasks/import', {
    tasks: localTasks.map((t) => ({
      title: t.title,
      dueDate: t.due_date,
      priority: t.priority,
      category: t.category,
    })),
  });
  await fullSync();
  return { imported: localTasks.length };
}

async function getOrgMembers() {
  if (!auth.isAuthenticated()) return [];
  await auth.refreshIfNeeded();
  return apiClient.get('/org/members');
}

async function getSyncStatus() {
  if (!auth.isAuthenticated()) return { authenticated: false };
  await auth.refreshIfNeeded();
  const status = await apiClient.get('/sync/status');
  return { authenticated: true, user: auth.getUser(), ...status };
}

module.exports = {
  pull,
  pushPending,
  fullSync,
  initSignalR,
  createTask,
  updateTask,
  deleteTask,
  getAllTasks,
  createNote,
  createReminder,
  importLocalToCloud,
  getOrgMembers,
  getSyncStatus,
  notifyRenderer,
};
