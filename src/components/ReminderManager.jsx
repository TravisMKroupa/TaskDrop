import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils';

const LEAD_TIMES = [
  { label: '15 min before', minutes: 15 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
];

export default function ReminderManager({ task }) {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fire_at: '',
    type_toast: true,
    type_sms: false,
    type_email: false,
    recurring: 'none',
  });

  const load = async () => {
    const data = await window.taskdrop.reminders.getByTask(task.id);
    setReminders(data);
  };

  useEffect(() => {
    load();
  }, [task.id]);

  const applyLeadTime = (minutes) => {
    if (!task.due_date) return;
    const due = new Date(task.due_date);
    due.setMinutes(due.getMinutes() - minutes);
    setForm((f) => ({ ...f, fire_at: due.toISOString().slice(0, 16) }));
    setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fire_at) return;
    await window.taskdrop.reminders.create({
      task_id: task.id,
      fire_at: new Date(form.fire_at).toISOString(),
      type_toast: form.type_toast,
      type_sms: form.type_sms,
      type_email: form.type_email,
      recurring: form.recurring,
    });
    setForm({ fire_at: '', type_toast: true, type_sms: false, type_email: false, recurring: 'none' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    await window.taskdrop.reminders.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-td-muted uppercase tracking-wide">Reminders</h4>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-td-accent hover:underline"
        >
          + Add
        </button>
      </div>

      {task.due_date && (
        <div className="flex flex-wrap gap-1 mb-2">
          {LEAD_TIMES.map((lt) => (
            <button
              key={lt.minutes}
              type="button"
              onClick={() => applyLeadTime(lt.minutes)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-td-border text-td-muted hover:border-td-accent hover:text-td-accent"
            >
              {lt.label}
            </button>
          ))}
        </div>
      )}

      {reminders.length === 0 && !showForm && (
        <p className="text-xs text-td-muted">No reminders set.</p>
      )}

      {reminders.length > 0 && (
        <div className="space-y-1 mb-2">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs bg-td-bg rounded px-2 py-1">
              <div>
                <span>{formatDate(r.fire_at)}</span>
                <span className="text-td-muted ml-2">
                  {[r.type_toast && '🔔', r.type_sms && '📱', r.type_email && '✉'].filter(Boolean).join(' ')}
                  {r.recurring !== 'none' && ` · ${r.recurring}`}
                </span>
              </div>
              <button type="button" onClick={() => handleDelete(r.id)} className="text-td-muted hover:text-td-danger">✕</button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-2 text-xs bg-td-bg rounded p-2 border border-td-border">
          <input
            type="datetime-local"
            value={form.fire_at}
            onChange={(e) => setForm({ ...form, fire_at: e.target.value })}
            required
            className="w-full px-2 py-1 rounded border border-td-border bg-td-surface focus:outline-none focus:border-td-accent"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={form.type_toast} onChange={(e) => setForm({ ...form, type_toast: e.target.checked })} />
              Toast
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={form.type_sms} onChange={(e) => setForm({ ...form, type_sms: e.target.checked })} />
              SMS
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={form.type_email} onChange={(e) => setForm({ ...form, type_email: e.target.checked })} />
              Email
            </label>
          </div>
          <select
            value={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.value })}
            className="w-full px-2 py-1 rounded border border-td-border bg-td-surface"
          >
            <option value="none">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1 rounded bg-td-accent text-white hover:opacity-90">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1 rounded border border-td-border text-td-muted">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
