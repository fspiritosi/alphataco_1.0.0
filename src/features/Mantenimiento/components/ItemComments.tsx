'use client';

import { getItemComments, type CommentEntry } from '@/features/Mantenimiento/utils/driverInfo';
import { cn } from '@/lib/utils';

interface ItemCommentsProps {
  /** Item de maintenance_order_items (con maintenance_request_items embebido) */
  item: unknown;
  /** Origen de la solicitud: 'checklist' | 'manual' | null */
  source: string | null | undefined;
}

const styleClasses: Record<CommentEntry['style'], string> = {
  driver: 'p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-800 dark:text-amber-200',
  validator: 'p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-blue-800 dark:text-blue-200',
  description: 'text-muted-foreground',
  chief: 'p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-emerald-800 dark:text-emerald-200',
};

const labelClasses: Record<CommentEntry['style'], string> = {
  driver: 'font-medium text-amber-800 dark:text-amber-200',
  validator: 'font-medium text-blue-800 dark:text-blue-200',
  description: 'text-muted-foreground',
  chief: 'font-medium text-emerald-800 dark:text-emerald-200',
};

/**
 * Componente reutilizable para mostrar comentarios de items de mantenimiento.
 * Deduplica automáticamente comentarios repetidos y ajusta labels según el origen.
 */
export function ItemComments({ item, source }: ItemCommentsProps) {
  const comments = getItemComments(item, source);

  if (comments.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {comments.map((comment, idx) => (
        <div key={idx} className={cn('text-sm', styleClasses[comment.style])}>
          <span className={labelClasses[comment.style]}>{comment.label}: </span>
          <span className={comment.style === 'description' ? '' : 'italic'}>{comment.text}</span>
        </div>
      ))}
    </div>
  );
}
