'use client';

import { Badge } from '@/components/ui/badge';
import { getItemComments, type CommentEntry } from '@/features/Mantenimiento/utils/driverInfo';
import { cn } from '@/lib/utils';
import { ClipboardList, FileText, HardHat, Truck, Wrench, type LucideIcon } from 'lucide-react';

interface ItemCommentsProps {
  /** Item de maintenance_order_items (con maintenance_request_items embebido) */
  item: unknown;
  /** Origen de la solicitud: 'checklist' | 'manual' | null */
  source: string | null | undefined;
  /** Nombre del supervisor de la solicitud padre, usado como fallback si *_comment_by es null */
  fallbackAuthorName?: string | null;
}

/** Configuración visual por estilo de comentario */
export const commentStyleConfig: Record<
  CommentEntry['style'],
  {
    icon: LucideIcon;
    container: string;
    border: string;
    badgeClass: string;
    nameClass: string;
    labelClass: string;
  }
> = {
  driver: {
    icon: Truck,
    container: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    badgeClass: 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300',
    nameClass: 'text-amber-900 dark:text-amber-100',
    labelClass: 'text-amber-700 dark:text-amber-300',
  },
  validator: {
    icon: ClipboardList,
    container: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300',
    nameClass: 'text-blue-900 dark:text-blue-100',
    labelClass: 'text-blue-700 dark:text-blue-300',
  },
  description: {
    icon: FileText,
    container: 'bg-muted',
    border: 'border',
    badgeClass: 'border-border text-muted-foreground',
    nameClass: 'text-foreground',
    labelClass: 'text-muted-foreground',
  },
  chief: {
    icon: HardHat,
    container: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeClass: 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300',
    nameClass: 'text-emerald-900 dark:text-emerald-100',
    labelClass: 'text-emerald-700 dark:text-emerald-300',
  },
  operator: {
    icon: Wrench,
    container: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    badgeClass: 'border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300',
    nameClass: 'text-purple-900 dark:text-purple-100',
    labelClass: 'text-purple-700 dark:text-purple-300',
  },
};

/**
 * Renderiza la línea de autor de un comentario: [Icono] Nombre [Badge Rol]
 * Componente reutilizable exportado para uso en otros diálogos.
 */
export function CommentAuthorLine({ comment, size = 'sm' }: { comment: CommentEntry; size?: 'sm' | 'xs' }) {
  const config = commentStyleConfig[comment.style];
  const Icon = config.icon;
  const isXs = size === 'xs';

  // Si no hay autor ni rol, mostrar solo el label descriptivo
  if (!comment.authorName && !comment.role) {
    return <span className={cn('font-medium', isXs ? 'text-xs' : 'text-sm', config.labelClass)}>{comment.label}</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('shrink-0', isXs ? 'h-3 w-3' : 'h-3.5 w-3.5', config.labelClass)} />
      {comment.authorName && (
        <span className={cn('font-semibold', isXs ? 'text-xs' : 'text-sm', config.nameClass)}>
          {comment.authorName}
        </span>
      )}
      {comment.role && (
        <Badge
          variant="outline"
          className={cn(isXs ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0', config.badgeClass)}
        >
          {comment.role}
        </Badge>
      )}
    </div>
  );
}

/**
 * Componente reutilizable para mostrar comentarios de items de mantenimiento.
 * Deduplica automáticamente comentarios repetidos y ajusta labels según el origen.
 */
export function ItemComments({ item, source, fallbackAuthorName }: ItemCommentsProps) {
  const comments = getItemComments(item, source, fallbackAuthorName);

  if (comments.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {comments.map((comment, idx) => {
        const config = commentStyleConfig[comment.style];
        return (
          <div key={idx} className={cn('text-sm p-2 rounded border', config.container, config.border)}>
            <CommentAuthorLine comment={comment} />
            <p className={cn('mt-0.5', comment.style !== 'description' ? 'italic' : '')}>{comment.text}</p>
          </div>
        );
      })}
    </div>
  );
}
