export interface DragItem {
  id: string;
  content: any;
}

export interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface DragDropContextProps {
  children: React.ReactNode;
  onDragEnd: (event: any) => void;
  items: string[];
}

export interface UseSortableReturn {
  attributes: any;
  listeners: any;
  setNodeRef: (node: HTMLElement) => void;
  transform: any;
  transition: any;
  isDragging: boolean;
}

export interface DragOverlayProps {
  children: React.ReactNode;
}

export type DragDropEvent = {
  active: {
    id: string;
    data: {
      current: {
        sortable: {
          index: number;
          containerId: string;
        };
      };
    };
  };
  over: {
    id: string;
    data: {
      current: {
        sortable: {
          index: number;
          containerId: string;
        };
      };
    };
  } | null;
};