import React, { useCallback, useEffect, useState } from 'react';
import FilterBar from './FilterBar';
import ScopeBar from './ScopeBar';
import SearchBar from './SearchBar';
import TaskList from './TaskList';
import TaskForm from './TaskForm';

export default function Sidebar({ onOpenSettings, user }) {
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadTasks = useCallback(async () => {
    const data = await window.taskdrop.tasks.getAll(filter, search, scope);
    setTasks(data);
  }, [filter, search, scope]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const timer = setTimeout(loadTasks, 300);
    return () => clearTimeout(timer);
  }, [search, loadTasks]);

  useEffect(() => {
    const handler = () => loadTasks();
    window.addEventListener('taskdrop-sync', handler);
    return () => window.removeEventListener('taskdrop-sync', handler);
  }, [loadTasks]);

  const handleToggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'active' : 'completed';
    await window.taskdrop.tasks.update(task.id, { status: newStatus });
    loadTasks();
  };

  const handleArchive = async (task) => {
    await window.taskdrop.tasks.update(task.id, { status: 'archived' });
    loadTasks();
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Delete "${task.title}"?`)) {
      await window.taskdrop.tasks.delete(task.id);
      loadTasks();
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleSave = async (formData) => {
    if (editingTask) {
      await window.taskdrop.tasks.update(editingTask.id, formData);
    } else {
      await window.taskdrop.tasks.create(formData);
    }
    setShowForm(false);
    setEditingTask(null);
    loadTasks();
  };

  const handleReorder = async (ids) => {
    await window.taskdrop.tasks.reorder(ids);
    loadTasks();
  };

  return (
    <div className="flex flex-col h-full w-sidebar bg-td-bg select-none">
      <header
        className="flex items-center justify-between px-3 py-3 border-b border-td-border bg-td-surface shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">📋</span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-td-gold tracking-wide">TaskDrop</h1>
            {user && (
              <p className="text-[10px] text-td-muted truncate">{user.organizationName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded text-td-muted hover:text-td-accent hover:bg-td-bg transition-colors"
            title="Settings"
          >
            ⚙
          </button>
          <button
            type="button"
            onClick={() => window.taskdrop.window.minimize()}
            className="p-1.5 rounded text-td-muted hover:text-td-text hover:bg-td-bg transition-colors"
            title="Hide sidebar"
          >
            ─
          </button>
        </div>
      </header>

      <FilterBar active={filter} onChange={setFilter} />
      <ScopeBar active={scope} onChange={setScope} />
      <SearchBar value={search} onChange={setSearch} />

      <div className="flex-1 overflow-y-auto">
        <TaskList
          tasks={tasks}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
          onComplete={handleComplete}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onReorder={handleReorder}
          filter={filter}
        />
      </div>

      <button
        type="button"
        onClick={() => { setEditingTask(null); setShowForm(true); }}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-td-accent text-white text-2xl shadow-lg hover:opacity-90 flex items-center justify-center z-40"
        title="Add task"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        +
      </button>

      {showForm && (
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}
