import React from 'react';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="px-3 py-2 border-b border-td-border">
      <input
        type="search"
        placeholder="Search tasks & notes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm rounded-md bg-td-bg border border-td-border text-td-text placeholder-td-muted focus:outline-none focus:border-td-accent"
      />
    </div>
  );
}
