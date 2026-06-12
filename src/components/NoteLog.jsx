import React, { useEffect, useState } from 'react';
import { formatNoteTime } from '../utils';

export default function NoteLog({ taskId }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await window.taskdrop.notes.getByTask(taskId);
    setNotes(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [taskId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    await window.taskdrop.notes.create(taskId, body.trim());
    setBody('');
    load();
  };

  const handleDelete = async (id) => {
    await window.taskdrop.notes.delete(id);
    load();
  };

  return (
    <div>
      <h4 className="text-xs font-semibold text-td-muted uppercase tracking-wide mb-2">Notes</h4>
      {loading ? (
        <p className="text-xs text-td-muted">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-td-muted mb-2">No notes yet.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-td-bg rounded p-2 text-xs group">
              <div className="flex justify-between items-start gap-2">
                <p className="whitespace-pre-wrap flex-1">{note.body}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="text-td-muted hover:text-td-danger opacity-0 group-hover:opacity-100 shrink-0"
                >
                  ✕
                </button>
              </div>
              <span className="text-td-muted text-[10px] mt-1 block">{formatNoteTime(note.created_at)}</span>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleAdd} className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 text-xs px-2 py-1.5 rounded bg-td-bg border border-td-border focus:outline-none focus:border-td-accent resize-none"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="self-end px-2 py-1 text-xs rounded bg-td-accent text-white disabled:opacity-40 hover:opacity-90"
        >
          Add
        </button>
      </form>
    </div>
  );
}
