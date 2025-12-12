import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableItemProps } from '../../types/drag-drop';

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  children,
  className = '',
  style = {}
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const combinedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    ...style
  };

  return (
    <div
      ref={setNodeRef}
      className={`sortable-item ${className}`}
      style={combinedStyle}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

export default SortableItem;