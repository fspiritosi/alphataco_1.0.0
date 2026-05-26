'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MY_TICKETS_WITH_UNREAD_QUERY_KEY } from './useMyTicketsWithUnread';
import type { TaskAppRealtimeEvent } from '@/shared/lib/taskapp/types';
import { Logger } from '@/lib/logger';

const logger = new Logger('features/Ayuda/realtime-sync');

/**
 * Abre un EventSource al proxy SSE de gh_gestion. Cada evento relevante
 * invalida el caché de tickets para forzar un refetch silencioso.
 *
 * EventSource reconecta automáticamente; cualquier error dispara también
 * un refetch de cortesía para no perder cambios durante desconexiones.
 */
export function useSupportTicketsRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource('/api/taskapp/events');

    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as TaskAppRealtimeEvent;
        if (event.type === 'ticket.updated' || event.type === 'comment.created') {
          queryClient.invalidateQueries({ queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY });
        }
      } catch (error) {
        logger.warn('Failed to parse SSE event', { data: { error } });
      }
    };

    source.onerror = () => {
      // EventSource reintenta solo. Refetch de cortesía por si perdimos eventos.
      logger.debug('SSE error / reconnecting');
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY });
    };

    return () => {
      source.close();
    };
  }, [queryClient]);
}
