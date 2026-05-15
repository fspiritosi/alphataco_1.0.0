'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Inbox } from 'lucide-react';
import { useMyTickets } from '../hooks/useMyTickets';
import type { MyTicketsData } from '../types';
import { MyTicketsList } from './MyTicketsList';
import { TicketForm } from './TicketForm';

interface Props {
  initialTickets: MyTicketsData;
}

export function HelpCenter({ initialTickets }: Props) {
  const { data: tickets = [] } = useMyTickets(initialTickets);
  const count = tickets.length;

  return (
    <section className="space-y-8 pt-2">
      <header className="flex items-center gap-4">
        <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <HelpCircle className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Ayuda</h1>
          <p className="text-sm text-muted-foreground">
            Reportá un problema o consultá el estado de tus solicitudes.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <TicketForm />
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Mis tickets</CardTitle>
              <CardDescription>Historial de reportes que enviaste.</CardDescription>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              aria-label={`${count} ${count === 1 ? 'ticket enviado' : 'tickets enviados'}`}
            >
              <Inbox className="h-3.5 w-3.5" />
              {count}
            </span>
          </CardHeader>
          <CardContent>
            <MyTicketsList tickets={tickets} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
