import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { DragDropContextProps } from '../../types/drag-drop';

export const DragDropProvider: React.FC<DragDropContextProps> = ({
  children,
  onDragEnd,
  items
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over?.id as string);

      const newItems = arrayMove(items, oldIndex, newIndex);

      onDragEnd({
        ...event,
        items: newItems,
        activeIndex: oldIndex,
        overIndex: newIndex
      });
    } else {
      onDragEnd(event);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {/* 拖拽时的覆盖层内容可以在这里自定义 */}
      </DragOverlay>
    </DndContext>
  );
};

export default DragDropProvider;