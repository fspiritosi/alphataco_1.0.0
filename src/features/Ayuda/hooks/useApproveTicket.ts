'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveSupportTicket } from '../actions/support-approval';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';
import { ticketDetailKey } from './useTicketDetail';

export function useApproveTicket(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveSupportTicket(ticketId),
    onSuccess: (updated) => {
      queryClient.setQueryData(ticketDetailKey(ticketId), updated);
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    },
  });
}
