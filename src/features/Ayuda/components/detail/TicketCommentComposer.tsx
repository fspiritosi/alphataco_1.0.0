'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateComment } from '../../hooks/useCreateComment';

interface Props {
  ticketId: number;
  currentUserEmail: string;
}

export function TicketCommentComposer({ ticketId, currentUserEmail }: Props) {
  const [body, setBody] = useState('');
  const mutation = useCreateComment(ticketId, currentUserEmail);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= 5000 && !mutation.isPending;

  async function handleSend() {
    if (!canSend) return;
    const toSend = trimmed;
    setBody('');
    try {
      await mutation.mutateAsync(toSend);
    } catch (e) {
      setBody(toSend);
      toast.error(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribí una respuesta… (Ctrl+Enter para enviar)"
        rows={2}
        className="resize-none border-0 focus-visible:ring-0"
        disabled={mutation.isPending}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{trimmed.length}/5000</span>
        <Button type="button" size="sm" onClick={handleSend} disabled={!canSend}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Enviar
        </Button>
      </div>
    </div>
  );
}
