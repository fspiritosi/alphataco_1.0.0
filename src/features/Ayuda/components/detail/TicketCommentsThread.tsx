'use client';

import { MessageSquare } from 'lucide-react';
import { TicketCommentsThreadSkeleton } from '../../fallback/TicketCommentsThreadSkeleton';
import { useTicketComments } from '../../hooks/useTicketComments';
import { TicketCommentComposer } from './TicketCommentComposer';
import { TicketCommentItem } from './TicketCommentItem';

interface Props {
  ticketId: number;
  currentUserEmail: string;
  currentUserName: string;
}

export function TicketCommentsThread({ ticketId, currentUserEmail, currentUserName }: Props) {
  const { data: comments = [], isLoading } = useTicketComments(ticketId);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <TicketCommentsThreadSkeleton />
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
          <p>Todavía no hay respuestas. Sé el primero en escribir.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id}>
              <TicketCommentItem
                comment={c}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
              />
            </li>
          ))}
        </ul>
      )}

      <TicketCommentComposer ticketId={ticketId} currentUserEmail={currentUserEmail} />
    </div>
  );
}
