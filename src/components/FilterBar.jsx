import React from 'react';

const FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
];

export default function FilterBar({ active, onChange }) {
  return (
    <div className="flex border-b border-td-border">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            active === f.id
              ? 'text-td-accent border-b-2 border-td-accent bg-td-surface/50'
              : 'text-td-muted hover:text-td-text'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
