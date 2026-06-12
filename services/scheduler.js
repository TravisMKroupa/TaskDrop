const crypto = require('crypto');
const cron = require('node-cron');
const db = require('./db');
const auth = require('./auth');
const apiClient = require('./apiClient');
const { sendSMS } = require('./twilio');
const { sendEmail } = require('./sendgrid');
const { showToast } = require('./notifications');

let job = null;
let deviceId = null;

async function dispatchViaCloud(reminder) {
  if (!auth.isAuthenticated()) return null;
  await auth.refreshIfNeeded();

  if (!deviceId) {
    try {
      const status = await apiClient.get('/sync/status');
      deviceId = status.deviceId;
    } catch {
      return null;
    }
  }

  if (!deviceId || !reminder.server_id) return null;

  try {
    const result = await apiClient.post('/sync/reminders/dispatch', {
      reminderId: reminder.server_id,
      deviceId,
      idempotencyKey: crypto.randomUUID(),
    });
    return result;
  } catch {
    return null;
  }
}

function startScheduler() {
  if (job) return;

  job = cron.schedule('* * * * *', async () => {
    const now = new Date().toISOString();
    let due = db.getDueReminders(now);

    if (auth.isAuthenticated()) {
      try {
        await auth.refreshIfNeeded();
        const remoteDue = await apiClient.get('/sync/reminders/due');
        for (const r of remoteDue || []) {
          const localTask = db.getTaskByServerId(r.taskId);
          if (!localTask) continue;
          due.push({
            id: r.id,
            server_id: r.id,
            task_id: localTask.id,
            type_toast: r.typeToast ? 1 : 0,
            type_sms: r.typeSms ? 1 : 0,
            type_email: r.typeEmail ? 1 : 0,
            recurring: (r.recurring || 'none').toLowerCase(),
            title: localTask.title,
            due_date: localTask.due_date,
          });
        }
      } catch {
        /* use local only */
      }
    }

    const seen = new Set();
    for (const reminder of due) {
      const key = reminder.server_id || reminder.id;
      if (seen.has(key)) continue;
      seen.add(key);

      const task = db.getTaskById(reminder.task_id);
      if (!task) continue;

      const cloudResult = await dispatchViaCloud(reminder);
      if (cloudResult && !cloudResult.dispatched && cloudResult.alreadyFired) continue;
      if (cloudResult && !cloudResult.dispatched && !cloudResult.alreadyFired) continue;

      const msg = cloudResult?.message || `Reminder: ${task.title}${task.due_date ? ` is due ${task.due_date}` : ''}`;

      try {
        if (reminder.type_toast) showToast({ title: 'TaskDrop', body: msg, reminderId: reminder.id });
        if (reminder.type_sms) await sendSMS(msg);
        if (reminder.type_email) {
          await sendEmail('TaskDrop Reminder', `<div style="font-family:sans-serif;padding:16px;background:#1A1A2E;color:#E8E8F0;"><h2 style="color:#7B5EA7;">TaskDrop Reminder</h2><p>${msg}</p></div>`);
        }
      } catch (err) {
        console.error('[TaskDrop] Reminder delivery error:', err.message);
      }

      if (!reminder.server_id) {
        db.markReminderFired(reminder.id, reminder.recurring);
      }
    }
  });
}

function stopScheduler() {
  if (job) {
    job.stop();
    job = null;
  }
}

module.exports = { startScheduler, stopScheduler };
