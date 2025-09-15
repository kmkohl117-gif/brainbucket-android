import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  Active,
  Over,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

interface SortableListProps<T> {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
  strategy?: 'vertical' | 'grid';
  children: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  renderOverlay?: (item: T) => React.ReactNode;
  getId: (item: T) => string;
  disabled?: boolean;
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  strategy = 'vertical',
  children,
  renderOverlay,
  getId,
  disabled = false,
  className,
}: SortableListProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);

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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const activeItem = items.find(item => getId(item) === active.id);
      setActiveItem(activeItem || null);
    },
    [items, getId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        const oldIndex = items.findIndex(item => getId(item) === active.id);
        const newIndex = items.findIndex(item => getId(item) === over?.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedItems = arrayMove(items, oldIndex, newIndex);
          onReorder(reorderedItems);
        }
      }
      
      setActiveItem(null);
    },
    [items, onReorder, getId]
  );

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);

  const sortingStrategy = strategy === 'grid' ? rectSortingStrategy : verticalListSortingStrategy;
  const itemIds = items.map(getId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={sortingStrategy} disabled={disabled}>
        <div className={className}>
          {items.map((item, index) => 
            children(item, index, activeItem ? getId(item) === getId(activeItem) : false)
          )}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeItem && renderOverlay ? (
          renderOverlay(activeItem)
        ) : (
          <div className="opacity-80 transform rotate-2">
            {activeItem && children(activeItem, -1, true)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}