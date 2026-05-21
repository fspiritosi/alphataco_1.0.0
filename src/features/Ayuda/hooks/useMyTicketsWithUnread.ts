'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyTicketsWithUnread } from '../actions/support-tickets';
import type { TicketWithUnread } from '@/shared/lib/taskapp/types';

export const MY_TICKETS_WITH_UNREAD_QUERY_KEY = ['ayuda', 'my-tickets-with-unread'] as const;

export function useMyTicketsWithUnread(initialData?: TicketWithUnread[]) {
  return useQuery({
    queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY,
    queryFn: () => getMyTicketsWithUnread(),
    staleTime: 60_000,
    initialData,
  });
}
