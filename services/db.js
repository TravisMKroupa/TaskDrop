const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'taskdrop.db');

let db;

function getDb() {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate();
  }
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      due_date    TEXT,
      priority    TEXT DEFAULT 'Medium',
      category    TEXT DEFAULT 'Personal',
      status      TEXT DEFAULT 'active',
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      fire_at       TEXT NOT NULL,
      type_toast    INTEGER DEFAULT 1,
      type_sms      INTEGER DEFAULT 0,
      type_email    INTEGER DEFAULT 0,
      recurring     TEXT DEFAULT 'none',
      snoozed_until TEXT,
      fired         INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0');
  } catch { /* exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN server_id TEXT'); } catch { /* exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN pending_sync INTEGER DEFAULT 0'); } catch { /* exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN assigned_to_user_id TEXT'); } catch { /* exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN assigned_to_name TEXT'); } catch { /* exists */ }
  try { db.exec('ALTER TABLE notes ADD COLUMN server_id TEXT'); } catch { /* exists */ }
  try { db.exec('ALTER TABLE reminders ADD COLUMN server_id TEXT'); } catch { /* exists */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function getAllTasks(filter = 'all', search = '', scope = 'all') {
  const database = getDb();
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  const today = new Date().toISOString().slice(0, 10);

  switch (filter) {
    case 'today':
      sql += " AND status = 'active' AND due_date IS NOT NULL AND date(due_date) = date(?)";
      params.push(today);
      break;
    case 'upcoming':
      sql += " AND status = 'active' AND due_date IS NOT NULL AND date(due_date) > date(?)";
      params.push(today);
      break;
    case 'completed':
      sql += " AND status = 'completed'";
      break;
    case 'all':
    default:
      sql += " AND status IN ('active', 'completed')";
      break;
  }

  if (search.trim()) {
    sql += ` AND (
      title LIKE ? OR
      id IN (SELECT task_id FROM notes WHERE body LIKE ?)
    )`;
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  if (scope === 'mine') {
    sql += ' AND (assigned_to_user_id IS NOT NULL OR server_id IS NULL)';
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC';
  return database.prepare(sql).all(...params);
}

function getTaskByServerId(serverId) {
  return getDb().prepare('SELECT * FROM tasks WHERE server_id = ?').get(serverId);
}

function getTaskById(id) {
  return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function createTask(task) {
  const database = getDb();
  const maxOrder = database.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM tasks').get();
  const stmt = database.prepare(`
    INSERT INTO tasks (title, due_date, priority, category, status, sort_order, server_id, pending_sync, assigned_to_user_id, assigned_to_name)
    VALUES (@title, @due_date, @priority, @category, @status, @sort_order, @server_id, @pending_sync, @assigned_to_user_id, @assigned_to_name)
  `);
  const result = stmt.run({
    title: task.title,
    due_date: task.due_date || null,
    priority: task.priority || 'Medium',
    category: task.category || 'Personal',
    status: (task.status || 'active').toLowerCase(),
    sort_order: task.sort_order ?? (maxOrder?.m ?? -1) + 1,
    server_id: task.server_id || null,
    pending_sync: task.pending_sync || 0,
    assigned_to_user_id: task.assigned_to_user_id || null,
    assigned_to_name: task.assigned_to_name || null,
  });
  return getTaskById(result.lastInsertRowid);
}

function updateTask(id, updates) {
  const fields = [];
  const params = { id };

  for (const key of ['title', 'due_date', 'priority', 'category', 'status', 'sort_order', 'server_id', 'pending_sync', 'assigned_to_user_id', 'assigned_to_name']) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = @${key}`);
      params[key] = updates[key];
    }
  }

  if (fields.length === 0) return getTaskById(id);

  fields.push("updated_at = datetime('now')");
  getDb()
    .prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`)
    .run(params);
  return getTaskById(id);
}

function deleteTask(id) {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return { success: true };
}

function reorderTasks(orderedIds) {
  const database = getDb();
  const stmt = database.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
  const tx = database.transaction((ids) => {
    ids.forEach((id, index) => stmt.run(index, id));
  });
  tx(orderedIds);
  return { success: true };
}

function getNotesByTaskId(taskId) {
  return getDb()
    .prepare('SELECT * FROM notes WHERE task_id = ? ORDER BY created_at ASC')
    .all(taskId);
}

function createNote(taskId, body) {
  const result = getDb()
    .prepare('INSERT INTO notes (task_id, body) VALUES (?, ?)')
    .run(taskId, body);
  return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
}

function deleteNote(id) {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
  return { success: true };
}

function getRemindersByTaskId(taskId) {
  return getDb()
    .prepare('SELECT * FROM reminders WHERE task_id = ? ORDER BY fire_at ASC')
    .all(taskId);
}

function createReminder(reminder) {
  const result = getDb()
    .prepare(`
      INSERT INTO reminders (task_id, fire_at, type_toast, type_sms, type_email, recurring)
      VALUES (@task_id, @fire_at, @type_toast, @type_sms, @type_email, @recurring)
    `)
    .run({
      task_id: reminder.task_id,
      fire_at: reminder.fire_at,
      type_toast: reminder.type_toast ? 1 : 0,
      type_sms: reminder.type_sms ? 1 : 0,
      type_email: reminder.type_email ? 1 : 0,
      recurring: reminder.recurring || 'none',
    });
  return getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
}

function updateReminder(id, updates) {
  const fields = [];
  const params = { id };

  for (const key of ['fire_at', 'type_toast', 'type_sms', 'type_email', 'recurring', 'snoozed_until', 'fired']) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = @${key}`);
      params[key] = updates[key];
    }
  }

  if (fields.length === 0) {
    return getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  }

  getDb()
    .prepare(`UPDATE reminders SET ${fields.join(', ')} WHERE id = @id`)
    .run(params);
  return getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(id);
}

function deleteReminder(id) {
  getDb().prepare('DELETE FROM reminders WHERE id = ?').run(id);
  return { success: true };
}

function getDueReminders(now) {
  return getDb()
    .prepare(`
      SELECT r.*, t.title, t.due_date
      FROM reminders r
      JOIN tasks t ON t.id = r.task_id
      WHERE r.fired = 0
        AND t.status = 'active'
        AND (
          (r.snoozed_until IS NOT NULL AND r.snoozed_until <= ?)
          OR (r.snoozed_until IS NULL AND r.fire_at <= ?)
        )
    `)
    .all(now, now);
}

function markReminderFired(id, recurring) {
  const database = getDb();
  if (recurring === 'daily') {
    const reminder = database.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (reminder) {
      const next = new Date(reminder.fire_at);
      next.setDate(next.getDate() + 1);
      database
        .prepare('UPDATE reminders SET fire_at = ?, snoozed_until = NULL WHERE id = ?')
        .run(next.toISOString(), id);
      return;
    }
  } else if (recurring === 'weekly') {
    const reminder = database.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (reminder) {
      const next = new Date(reminder.fire_at);
      next.setDate(next.getDate() + 7);
      database
        .prepare('UPDATE reminders SET fire_at = ?, snoozed_until = NULL WHERE id = ?')
        .run(next.toISOString(), id);
      return;
    }
  }
  database.prepare('UPDATE reminders SET fired = 1 WHERE id = ?').run(id);
}

function snoozeReminder(id, minutes) {
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  return updateReminder(id, { snoozed_until: until, fired: 0 });
}

function exportTasksToCsv() {
  const tasks = getDb().prepare('SELECT * FROM tasks ORDER BY sort_order ASC').all();
  const headers = ['id', 'title', 'due_date', 'priority', 'category', 'status', 'created_at', 'updated_at'];
  const rows = tasks.map((t) => headers.map((h) => `"${String(t[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function clearCompletedAndArchived() {
  const database = getDb();
  const ids = database
    .prepare("SELECT id FROM tasks WHERE status IN ('completed', 'archived')")
    .all()
    .map((r) => r.id);
  if (ids.length === 0) return { deleted: 0 };
  const placeholders = ids.map(() => '?').join(',');
  database.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...ids);
  return { deleted: ids.length };
}

function getLastSyncTime() {
  const row = getDb().prepare("SELECT value FROM sync_meta WHERE key = 'last_sync'").get();
  return row?.value || null;
}

function setLastSyncTime(iso) {
  getDb().prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', ?)").run(iso);
}

function updateTaskLocalId(localId, serverId, remote) {
  getDb().prepare(`
    UPDATE tasks SET server_id = ?, pending_sync = 0, title = ?, due_date = ?, priority = ?, category = ?,
    status = ?, sort_order = ?, assigned_to_user_id = ?, assigned_to_name = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    serverId,
    remote.title,
    remote.dueDate,
    remote.priority,
    remote.category,
    (remote.status || 'Active').toLowerCase(),
    remote.sortOrder,
    remote.assignedToUserId,
    remote.assignedToName,
    localId
  );
}

function mergeSyncData(data) {
  const database = getDb();
  const tx = database.transaction(() => {
    for (const t of data.tasks || []) {
      const existing = getTaskByServerId(t.id);
      const status = (t.status || 'Active').toLowerCase();
      if (existing) {
        database.prepare(`
          UPDATE tasks SET title=?, due_date=?, priority=?, category=?, status=?, sort_order=?,
          assigned_to_user_id=?, assigned_to_name=?, updated_at=datetime('now'), pending_sync=0 WHERE server_id=?
        `).run(t.title, t.dueDate, t.priority, t.category, status, t.sortOrder, t.assignedToUserId, t.assignedToName, t.id);
      } else {
        database.prepare(`
          INSERT INTO tasks (server_id, title, due_date, priority, category, status, sort_order, assigned_to_user_id, assigned_to_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(t.id, t.title, t.dueDate, t.priority, t.category, status, t.sortOrder, t.assignedToUserId, t.assignedToName);
      }
    }
  });
  tx();
}

function replaceTasksFromRemote(tasks) {
  const database = getDb();
  database.prepare('DELETE FROM tasks WHERE server_id IS NOT NULL').run();
  for (const t of tasks) {
    database.prepare(`
      INSERT INTO tasks (server_id, title, due_date, priority, category, status, sort_order, assigned_to_user_id, assigned_to_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t.id, t.title, t.dueDate, t.priority, t.category,
      (t.status || 'Active').toLowerCase(), t.sortOrder, t.assignedToUserId, t.assignedToName
    );
  }
}

function getPendingChanges() {
  return {
    tasksCreated: [],
    tasksUpdated: [],
    tasksDeleted: [],
  };
}

function queuePendingTask(id) {
  getDb().prepare('UPDATE tasks SET pending_sync = 1 WHERE id = ?').run(id);
}

function queuePendingDelete(id) {
  queuePendingTask(id);
}

function clearPendingFlags() {
  getDb().prepare('UPDATE tasks SET pending_sync = 0 WHERE pending_sync = 1').run();
}

module.exports = {
  getDb,
  getAllTasks,
  getTaskById,
  getTaskByServerId,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getNotesByTaskId,
  createNote,
  deleteNote,
  getRemindersByTaskId,
  createReminder,
  updateReminder,
  deleteReminder,
  getDueReminders,
  markReminderFired,
  snoozeReminder,
  exportTasksToCsv,
  clearCompletedAndArchived,
  getLastSyncTime,
  setLastSyncTime,
  updateTaskLocalId,
  mergeSyncData,
  replaceTasksFromRemote,
  getPendingChanges,
  queuePendingTask,
  queuePendingDelete,
  clearPendingFlags,
};
