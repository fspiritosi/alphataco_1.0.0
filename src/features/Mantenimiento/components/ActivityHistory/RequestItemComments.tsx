'use client';

import { Badge } from '@/components/ui/badge';
import type { RequestItemComment } from '@/features/Mantenimiento/Operaciones/actions/actionsServer';
import { MessageSquare, User } from 'lucide-react';
import { useMemo } from 'react';

/**
 * Comentarios que la gente escribió sobre los items del pedido (ticket 649).
 *
 * Van aparte del timeline porque no son eventos: se guardan en la propia fila del
 * item (`maintenance_request_items.driver_comment` y compañía) sin registrar una
 * entrada en `maintenance_activity_log`, así que no tienen fecha ni orden propio.
 * Por eso se agrupan por item, que es como el usuario los busca ("¿qué dijeron de
 * esta reparación?").
 */
const AUTHOR_LABELS: Record<RequestItemComment['author'], string> = {
  driver: 'Chofer',
  supervisor: 'Supervisor',
  validator: 'Validación',
};

const AUTHOR_BADGE_CLASSES: Record<RequestItemComment['author'], string> = {
  driver: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  supervisor:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  validator:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
};

interface RequestItemCommentsProps {
  comments: RequestItemComment[];
  /** Dibuja la línea conectora del timeline cuando abajo viene otro evento */
  hasMoreItems?: boolean;
}

export function RequestItemComments({ comments, hasMoreItems = false }: RequestItemCommentsProps) {
  // Un item puede tener comentario del chofer Y del supervisor: se muestran juntos
  // bajo el nombre del item en vez de repetir el encabezado por cada uno.
  const groups = useMemo(() => {
    const byItem = new Map<string, { itemLabel: string; entries: RequestItemComment[] }>();
    for (const comment of comments) {
      const group = byItem.get(comment.itemId);
      if (group) group.entries.push(comment);
      else byItem.set(comment.itemId, { itemLabel: comment.itemLabel, entries: [comment] });
    }
    return Array.from(byItem.values());
  }, [comments]);

  if (groups.length === 0) return null;

  return (
    <div className="relative flex items-start gap-3 pl-1">
      {hasMoreItems && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}

      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-violet-50 border-violet-600 dark:bg-violet-950/40">
        <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-300" />
      </div>

      <div className="flex-1 pt-0.5 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">Comentarios sobre los items del pedido</span>
          <Badge variant="outline" className="text-xs">
            {comments.length === 1 ? '1 comentario' : `${comments.length} comentarios`}
          </Badge>
        </div>

        <div className="mt-2 space-y-2">
          {groups.map((group, index) => (
            <div key={index} className="rounded-md border bg-muted/40 p-2.5 text-sm">
              <p className="font-medium text-xs text-muted-foreground">{group.itemLabel}</p>
              <ul className="mt-1.5 space-y-1.5">
                {group.entries.map((entry, i) => (
                  <li key={i} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${AUTHOR_BADGE_CLASSES[entry.author]}`}>
                      {AUTHOR_LABELS[entry.author]}
                    </Badge>
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap break-words">{entry.comment}</p>
                      {entry.authorName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" />
                          {entry.authorName}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
