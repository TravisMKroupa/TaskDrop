import React from 'react';

const SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'team', label: 'Team' },
  { id: 'manager', label: "Manager's" },
];

export default function ScopeBar({ active, onChange }) {
  return (
    <div className="flex border-b border-td-border px-1 py-1 gap-1">
      {SCOPES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
            active === s.id
              ? 'bg-td-accent/20 text-td-accent'
              : 'text-td-muted hover:text-td-text'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
