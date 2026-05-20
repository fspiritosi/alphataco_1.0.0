'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { useApproveTicket } from '../../hooks/useApproveTicket';
import { useRejectTicket } from '../../hooks/useRejectTicket';

interface Props {
  ticket: Ticket;
  currentUserEmail: string;
}

export function TicketApprovalBanner({ ticket, currentUserEmail }: Props) {
  const isApprover = ticket.approver_email != null && ticket.approver_email === currentUserEmail;
  const canApprove = isApprover && ticket.status?.slug === 'valued';

  const approve = useApproveTicket(ticket.id);
  const reject = useRejectTicket(ticket.id);

  if (!canApprove) return null;

  async function handleApprove() {
    try {
      await approve.mutateAsync();
      toast.success('Aprobación registrada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar');
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync();
      toast.success('Rechazo registrado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al rechazar');
    }
  }

  const isBusy = approve.isPending || reject.isPending;

  return (
    <div className="border-b bg-amber-50 dark:bg-amber-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Te pidieron aprobar esta valuación</p>
            {ticket.estimated_hours != null && (
              <p className="text-xs text-muted-foreground">
                Estimación: <strong>{ticket.estimated_hours} hs</strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isBusy}>
                Rechazar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmás que rechazás esta valuación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Al rechazar, el ticket vuelve a planificación para revisar el alcance o el esfuerzo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject}>Rechazar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={handleApprove} disabled={isBusy}>
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar
          </Button>
        </div>
      </div>
    </div>
  );
}
