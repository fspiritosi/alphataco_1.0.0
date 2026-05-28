'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupportTicket } from '../actions/support-tickets';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    },
  });
}
