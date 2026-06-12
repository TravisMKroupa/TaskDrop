const PRIORITY_COLORS = {
  Low: 'text-td-success border-td-success/40',
  Medium: 'text-td-warning border-td-warning/40',
  High: 'text-td-danger border-td-danger/40',
};

const PRIORITY_DOT = {
  Low: 'bg-td-success',
  Medium: 'bg-td-warning',
  High: 'bg-td-danger',
};

export { PRIORITY_COLORS, PRIORITY_DOT };

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatNoteTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
