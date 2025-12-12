import { useState } from 'react';

export const useDragDrop = <T,>(
  initialItems: T[],
  getItemId: (item: T) => string
) => {
  const [items, setItems] = useState<T[]>(initialItems);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: any) => {
    const { active, over, items: newItems } = event;

    if (newItems) {
      // 使用新排序的项目
      const reorderedItems = newItems.map((id: string) =>
        items.find(item => getItemId(item) === id)
      ).filter(Boolean) as T[];

      setItems(reorderedItems);
    } else if (active.id !== over?.id) {
      // 手动计算新顺序
      const oldIndex = items.findIndex(item => getItemId(item) === active.id);
      const newIndex = items.findIndex(item => getItemId(item) === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = [...items];
        const [removed] = reorderedItems.splice(oldIndex, 1);
        reorderedItems.splice(newIndex, 0, removed);
        setItems(reorderedItems);
      }
    }

    setIsDragging(false);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const reorderedItems = [...items];
    const [removed] = reorderedItems.splice(fromIndex, 1);
    reorderedItems.splice(toIndex, 0, removed);
    setItems(reorderedItems);
  };

  const resetItems = () => {
    setItems(initialItems);
  };

  return {
    items,
    setItems,
    isDragging,
    handleDragStart,
    handleDragEnd,
    moveItem,
    resetItems,
    itemIds: items.map(getItemId)
  };
};