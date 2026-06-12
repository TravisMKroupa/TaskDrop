import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';

function SortableTaskCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export default function TaskList({
  tasks,
  expandedId,
  onToggleExpand,
  onComplete,
  onEdit,
  onArchive,
  onDelete,
  onReorder,
  filter,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map((t) => t.id));
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-td-muted text-sm">No tasks here yet.</p>
        <p className="text-td-muted text-xs mt-1">Tap + to capture something fast.</p>
      </div>
    );
  }

  const canDrag = filter === 'all' || filter === 'today' || filter === 'upcoming';

  if (!canDrag) {
    return (
      <div className="space-y-2 p-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            expanded={expandedId === task.id}
            onToggleExpand={onToggleExpand}
            onComplete={onComplete}
            onEdit={onEdit}
            onArchive={onArchive}
            onDelete={onDelete}
            dragHandleProps={{}}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 p-3">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              expanded={expandedId === task.id}
              onToggleExpand={onToggleExpand}
              onComplete={onComplete}
              onEdit={onEdit}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
