'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectSupportTicket } from '../actions/support-approval';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';
import { ticketDetailKey } from './useTicketDetail';

export function useRejectTicket(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectSupportTicket(ticketId),
    onSuccess: (updated) => {
      queryClient.setQueryData(ticketDetailKey(ticketId), updated);
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    },
  });
}
