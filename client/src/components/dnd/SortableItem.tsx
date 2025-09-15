import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  handle?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(
  ({ id, children, className, disabled = false, handle = false, dragHandleProps, ...props }, ref) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      setActivatorNodeRef,
    } = useSortable({
      id,
      disabled,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 50 : 'auto',
    };

    if (handle) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            'relative',
            isDragging && 'opacity-50',
            className
          )}
          {...props}
        >
          <div
            ref={setActivatorNodeRef}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-10',
              'text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing',
              'touch-none select-none'
            )}
            {...attributes}
            {...listeners}
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          {children}
        </div>
      );
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'touch-none select-none',
          isDragging && 'opacity-50',
          !disabled && 'cursor-grab active:cursor-grabbing',
          className
        )}
        {...attributes}
        {...listeners}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SortableItem.displayName = 'SortableItem';