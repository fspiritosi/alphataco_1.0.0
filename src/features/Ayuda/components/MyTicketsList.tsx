'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TicketWithUnread } from '@/shared/lib/taskapp/types';
import { EmptyTicketsState } from './EmptyTicketsState';
import { TicketCard } from './TicketCard';

const PAGE_SIZE = 10;

interface Props {
  tickets: TicketWithUnread[];
  activeTicketId: number | null;
  onSelect: (id: number) => void;
}

export function MyTicketsList({ tickets, activeTicketId, onSelect }: Props) {
  const sorted = useMemo(
    () => [...tickets].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [tickets]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const [page, setPage] = useState(1);
  const previousCount = useRef(sorted.length);
  const previousFirstId = useRef<number | null>(sorted[0]?.id ?? null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Si aparece un ticket nuevo (el primero de la lista cambia o crece), saltamos a página 1
  // para garantizar que el usuario vea su nuevo ticket "primerito".
  useEffect(() => {
    const firstId = sorted[0]?.id ?? null;
    const isNewer = sorted.length > previousCount.current || firstId !== previousFirstId.current;
    if (isNewer && page !== 1) {
      setPage(1);
    }
    previousCount.current = sorted.length;
    previousFirstId.current = firstId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted]);

  // Si el total de páginas disminuye (ej. el backend cambió la cantidad), corregimos page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (sorted.length === 0) {
    return <EmptyTicketsState />;
  }

  const start = (page - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);
  const showPagination = sorted.length > PAGE_SIZE;

  function goTo(next: number) {
    setPage(next);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-4">
      <div
        ref={listRef}
        // Padding generoso + margenes negativos compensatorios para que la sombra del hover
        // y el border-l-4 de las cards no se vean cortados por overflow-y-auto.
        className="flex flex-col gap-3 max-h-[65vh] overflow-y-auto px-3 py-2 -mx-3 -my-2"
      >
        {visible.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            onClick={onSelect}
            isActive={activeTicketId === t.id}
          />
        ))}
      </div>

      {showPagination && (
        <nav
          className="flex items-center justify-between gap-3 border-t pt-3"
          aria-label="Paginación"
        >
          <p className="text-xs text-muted-foreground tabular-nums">
            Mostrando{' '}
            <span className="font-medium text-foreground">
              {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)}
            </span>{' '}
            de <span className="font-medium text-foreground">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => goTo(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => goTo(page + 1)}
              disabled={page === totalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
