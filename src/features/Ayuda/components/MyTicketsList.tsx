'use client';

import type { Ticket } from '@/shared/lib/taskapp/types';
import { EmptyTicketsState } from './EmptyTicketsState';
import { TicketCard } from './TicketCard';

interface Props {
  tickets: Ticket[];
}

export function MyTicketsList({ tickets }: Props) {
  if (tickets.length === 0) {
    return <EmptyTicketsState />;
  }

  return (
    <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
    </div>
  );
}
