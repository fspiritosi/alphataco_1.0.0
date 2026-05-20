'use client';

import { Card } from '@/components/ui/card';
import { Clock, Tag } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { parseCategoryFromTitle } from '../constants/categories';
import { statusFor } from '../constants/ticket-status';
import { TicketPriorityBadge } from './TicketPriorityBadge';

interface Props {
  ticket: Ticket;
  onClick: (id: number) => void;
  isActive?: boolean;
}

export function TicketCard({ ticket, onClick, isActive }: Props) {
  const { categoryLabel, categoryDef, cleanTitle } = parseCategoryFromTitle(ticket.title);
  const status = statusFor(ticket.status?.slug, ticket.status?.name);
  const CategoryIcon = categoryDef?.icon ?? Tag;
  const isPulsing = ticket.status?.slug === 'in_progress' || ticket.status?.slug === 'open';

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(ticket.id);
        }
      }}
      className={`group relative overflow-hidden border-l-4 ${status.borderClass} cursor-pointer p-0 gap-0
                  transition-all duration-200 ease-out
                  hover:-translate-y-0.5 hover:shadow-md
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  animate-in fade-in-50 slide-in-from-top-2
                  ${isActive ? 'ring-2 ring-primary/40 shadow-md -translate-y-0.5' : ''}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 right-0 h-24 w-32 bg-gradient-to-bl ${status.tintClass} to-transparent opacity-60`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:16px_16px]"
      />

      <div className="relative p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          {categoryLabel ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CategoryIcon className="h-3.5 w-3.5" />
              {categoryLabel}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <TicketPriorityBadge slug={ticket.priority} />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-base leading-snug tracking-tight line-clamp-2 text-foreground">
            {cleanTitle}
          </h3>
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
            <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dotClass}`}>
              {isPulsing && (
                <span
                  className={`absolute inset-0 rounded-full ${status.dotClass} opacity-60 animate-ping`}
                />
              )}
            </span>
            {status.label}
          </span>
          <time
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            dateTime={ticket.created_at}
          >
            <Clock className="h-3 w-3" />
            {moment(ticket.created_at).locale('es').fromNow()}
          </time>
        </div>
      </div>
    </Card>
  );
}
