import React, { useEffect, useState } from 'react';

const PRIORITIES = ['Low', 'Medium', 'High'];
const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Event', 'Finance', 'Other'];

export default function TaskForm({ task, onSave, onCancel }) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    due_date: '',
    priority: 'Medium',
    category: 'Personal',
    assigned_to_user_id: '',
  });

  useEffect(() => {
    window.taskdrop?.settings.get().then((s) => {
      if (s.categories?.length) setCategories(s.categories);
    });
    window.taskdrop?.org.members().then(setMembers).catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        due_date: task.due_date ? task.due_date.slice(0, 16) : '',
        priority: task.priority || 'Medium',
        category: task.category || 'Personal',
        assigned_to_user_id: task.assigned_to_user_id || '',
      });
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      title: form.title.trim(),
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      assigned_to_user_id: form.assigned_to_user_id || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-slide-in">
      <div className="w-full bg-td-surface border-t border-td-border rounded-t-xl p-4 max-h-[85%] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-td-gold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button type="button" onClick={onCancel} className="text-td-muted hover:text-td-text">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-td-muted block mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
              placeholder="What needs doing?"
              className="w-full px-3 py-2 text-sm rounded-md bg-td-bg border border-td-border focus:outline-none focus:border-td-accent"
            />
          </div>

          <div>
            <label className="text-xs text-td-muted block mb-1">Due Date & Time</label>
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md bg-td-bg border border-td-border focus:outline-none focus:border-td-accent"
            />
          </div>

          {members.length > 0 && (
            <div>
              <label className="text-xs text-td-muted block mb-1">Assign to</label>
              <select
                value={form.assigned_to_user_id}
                onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md bg-td-bg border border-td-border focus:outline-none focus:border-td-accent"
              >
                <option value="">Unassigned</option>
                {members.filter((m) => m.isActive).map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-td-muted block mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md bg-td-bg border border-td-border focus:outline-none focus:border-td-accent"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-td-muted block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md bg-td-bg border border-td-border focus:outline-none focus:border-td-accent"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 text-sm font-medium rounded-md bg-td-accent text-white hover:opacity-90"
            >
              {task ? 'Save Changes' : 'Add Task'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border border-td-border text-td-muted hover:text-td-text"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
