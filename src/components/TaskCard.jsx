import React, { useState } from 'react';
import NoteLog from './NoteLog';
import ReminderManager from './ReminderManager';
import { PRIORITY_COLORS, PRIORITY_DOT, formatDate, isOverdue } from '../utils';

export default function TaskCard({
  task,
  expanded,
  onToggleExpand,
  onComplete,
  onEdit,
  onArchive,
  onDelete,
  dragHandleProps,
}) {
  const overdue = isOverdue(task.due_date) && task.status === 'active';
  const completed = task.status === 'completed';

  return (
    <div
      className={`rounded-lg border bg-td-surface animate-slide-in ${
        completed ? 'opacity-60 border-td-border' : 'border-td-border hover:border-td-accent/50'
      } ${overdue ? 'border-td-danger/60' : ''}`}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          className="drag-handle mt-1 text-td-muted hover:text-td-accent shrink-0"
          {...dragHandleProps}
          aria-label="Drag to reorder"
        >
          ⠿
        </button>

        <button
          type="button"
          onClick={() => onComplete(task)}
          className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs ${
            completed
              ? 'bg-td-success border-td-success text-white'
              : 'border-td-muted hover:border-td-accent'
          }`}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed ? '✓' : ''}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggleExpand(task.id)}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.Medium}`} />
            <h3 className={`text-sm font-medium truncate ${completed ? 'line-through text-td-muted' : ''}`}>
              {task.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-td-muted">
            {task.assigned_to_name && (
              <span className="px-1.5 py-0.5 rounded bg-td-accent/20 text-td-accent border border-td-accent/30">
                → {task.assigned_to_name}
              </span>
            )}
            {task.category && (
              <span className="px-1.5 py-0.5 rounded bg-td-bg border border-td-border">{task.category}</span>
            )}
            {task.due_date && (
              <span className={overdue ? 'text-td-danger' : ''}>{formatDate(task.due_date)}</span>
            )}
            <span className={`${PRIORITY_COLORS[task.priority]?.split(' ')[0] || ''}`}>{task.priority}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button type="button" onClick={() => onEdit(task)} className="text-td-muted hover:text-td-accent text-xs" title="Edit">✎</button>
          <button type="button" onClick={() => onArchive(task)} className="text-td-muted hover:text-td-gold text-xs" title="Archive">📦</button>
          <button type="button" onClick={() => onDelete(task)} className="text-td-muted hover:text-td-danger text-xs" title="Delete">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-td-border px-3 pb-3 pt-2 space-y-3">
          <NoteLog taskId={task.id} />
          <ReminderManager task={task} />
        </div>
      )}
    </div>
  );
}
