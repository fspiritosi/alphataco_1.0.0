import { Card } from '@/components/ui/card';
import moment from 'moment';
import 'moment/locale/es';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { parseCategoryFromTitle } from '../constants/categories';
import { statusFor } from '../constants/ticket-status';
import { TicketCategoryBadge } from './TicketCategoryBadge';
import { TicketStatusBadge } from './TicketStatusBadge';

interface Props {
  ticket: Ticket;
}

export function TicketCard({ ticket }: Props) {
  const { categoryLabel, cleanTitle } = parseCategoryFromTitle(ticket.title);
  const status = statusFor(ticket.status?.slug, ticket.status?.name);

  return (
    <Card
      className={`border-l-4 ${status.borderClass} p-4 animate-in fade-in-50 slide-in-from-top-2 duration-300`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug">{cleanTitle}</h3>
        {categoryLabel && <TicketCategoryBadge label={categoryLabel} />}
      </div>
      {ticket.description && (
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <TicketStatusBadge slug={ticket.status?.slug} name={ticket.status?.name} />
        <time className="text-xs text-muted-foreground" dateTime={ticket.created_at}>
          {moment(ticket.created_at).locale('es').fromNow()}
        </time>
      </div>
    </Card>
  );
}
