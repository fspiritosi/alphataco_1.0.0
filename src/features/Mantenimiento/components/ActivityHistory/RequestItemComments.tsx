'use client';

import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { commentStyleConfig } from '@/features/Mantenimiento/components/ItemComments';
import type { RequestItemComment } from '@/features/Mantenimiento/Operaciones/actions/actionsServer';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Comentarios que la gente escribió sobre los items del pedido (ticket 649).
 *
 * Van aparte del timeline porque no son eventos: se guardan en la propia fila del
 * item (`maintenance_request_items.driver_comment` y compañía) sin registrar una
 * entrada en `maintenance_activity_log`, así que no tienen fecha ni orden propio.
 * Por eso se agrupan por item, que es como el usuario los busca ("¿qué dijeron de
 * esta reparación?").
 */

/**
 * Estilo de cada autor.
 *
 * Se toma de `commentStyleConfig`, el mismo mapa que usan los 8 diálogos que ya
 * muestran estos comentarios: ahí el chofer es ámbar y el supervisor azul. Tener
 * un mapa propio hacía que el mismo comentario cambiara de color según la pantalla.
 */
const AUTHOR_STYLE: Record<RequestItemComment['author'], keyof typeof commentStyleConfig> = {
  driver: 'driver',
  supervisor: 'validator',
  validator: 'validator',
};

const AUTHOR_LABELS: Record<RequestItemComment['author'], string> = {
  driver: 'Chofer',
  supervisor: 'Supervisor',
  validator: 'Validador',
};

/** Con pocos comentarios abre expandido: el caso barato no debe costar un clic */
const AUTO_EXPAND_LIMIT = 3;

interface RequestItemCommentsProps {
  comments: RequestItemComment[];
  /** Dibuja la línea conectora del timeline cuando abajo viene otro evento */
  hasMoreItems?: boolean;
}

export function RequestItemComments({ comments, hasMoreItems = false }: RequestItemCommentsProps) {
  // Un item puede tener comentario del chofer Y del supervisor: se muestran juntos
  // bajo el nombre del item en vez de repetir el encabezado por cada uno.
  const groups = useMemo(() => {
    const byItem = new Map<string, { itemId: string; itemLabel: string; entries: RequestItemComment[] }>();
    for (const comment of comments) {
      const group = byItem.get(comment.itemId);
      if (group) group.entries.push(comment);
      else byItem.set(comment.itemId, { itemId: comment.itemId, itemLabel: comment.itemLabel, entries: [comment] });
    }
    return Array.from(byItem.values());
  }, [comments]);

  const [open, setOpen] = useState(comments.length <= AUTO_EXPAND_LIMIT);

  if (groups.length === 0) return null;

  const resumen = `${comments.length === 1 ? '1 comentario' : `${comments.length} comentarios`} en ${
    groups.length === 1 ? '1 ítem' : `${groups.length} ítems`
  }`;

  return (
    <div className="relative flex items-start gap-3 pl-1">
      {hasMoreItems && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}

      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-violet-50 border-violet-600 dark:bg-violet-950/40 dark:border-violet-400">
        <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-300" />
      </div>

      <div className="flex-1 pt-0.5 pb-4">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-left hover:underline">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">Comentarios sobre los ítems del pedido</span>
            <Badge variant="outline" className="text-xs ml-1 tabular-nums">
              {resumen}
            </Badge>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-2 space-y-2">
            {groups.map((group) => (
              <div key={group.itemId} className="rounded-md border bg-muted/40 p-2.5">
                {/* El nombre del ítem es el ancla de lectura: va primero en jerarquía */}
                <p className="text-sm font-medium text-foreground">{group.itemLabel}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {group.entries.map((entry) => {
                    const style = commentStyleConfig[AUTHOR_STYLE[entry.author]];
                    const Icon = style.icon;
                    return (
                      <li
                        key={`${entry.itemId}-${entry.author}`}
                        className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2"
                      >
                        <Badge variant="outline" className={cn('text-xs shrink-0', style.badgeClass)}>
                          {AUTHOR_LABELS[entry.author]}
                        </Badge>
                        <div className="min-w-0">
                          {/* Tope de medida: a 1152px de modal una línea suelta pasa los 180 caracteres */}
                          <p className="max-w-[70ch] whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {entry.comment}
                          </p>
                          {entry.authorName && (
                            <p className={cn('mt-0.5 flex items-center gap-1 text-xs', style.labelClass)}>
                              <Icon className="h-3 w-3 shrink-0" />
                              {entry.authorName}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
