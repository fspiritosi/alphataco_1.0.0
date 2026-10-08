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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { unwrapAction } from '@/features/Warehouses/lib/unwrap-action';
import { Logger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, Copy, Pencil, Send, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  copyPurchaseRequest,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  type PurchaseRequestDetail,
} from '../../actions/requests.server';
import { PURCHASES_QUERY_KEYS } from '../../lib/query-keys';

const logger = new Logger('Purchases/PurchaseRequestActions');

interface ConfirmProps {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  successMessage: string;
  variant?: 'default' | 'outline' | 'destructive';
  /** Si pide motivo: obligatorio u opcional. */
  motive?: { label: string; placeholder: string; required: boolean };
  run: (notes: string) => Promise<ActionResult>;
}

/** Confirmacion de un cambio de estado, con motivo cuando corresponde. */
function ConfirmAction({ icon: Icon, variant = 'outline', motive, run, ...text }: ConfirmProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const motiveId = useId();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () => unwrapAction(await run(notes)),
    onSuccess: () => {
      toast.success(text.successMessage);
      setOpen(false);
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEYS.requests });
      router.refresh();
    },
    onError: (error) => {
      logger.error('Error al cambiar el estado de la solicitud', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo completar la acción');
    },
  });

  const missingMotive = motive?.required === true && !notes.trim();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Icon className="mr-1 h-4 w-4" />
        {text.label}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>{text.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {motive && (
          <div className="space-y-2">
            <Label htmlFor={motiveId}>{motive.label}</Label>
            <Textarea id={motiveId} rows={3} value={notes} placeholder={motive.placeholder} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending || missingMotive}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={(e) => {
              // La accion se confirma al terminar: si falla, el dialogo queda abierto con el motivo.
              e.preventDefault();
              mutation.mutate();
            }}
          >
            {mutation.isPending ? 'Procesando…' : text.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Botones del detalle segun el estado de la solicitud y los permisos (vienen calculados del servidor). */
export function PurchaseRequestActions({ request }: { request: PurchaseRequestDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const copy = useMutation({
    mutationFn: async () => unwrapAction(await copyPurchaseRequest(request.id)),
    onSuccess: ({ id, number }) => {
      toast.success(`Borrador ${number} creado a partir de ${request.number}`);
      void queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEYS.requests });
      router.push(`/dashboard/purchases/requests/${id}/edit`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo copiar la solicitud'),
  });

  const { can } = request;
  return (
    <div className="flex flex-wrap gap-2">
      {can.edit && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/purchases/requests/${request.id}/edit`}>
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Link>
        </Button>
      )}
      {can.submit && (
        <ConfirmAction
          icon={Send}
          variant="default"
          label="Enviar a aprobación"
          title={`¿Enviar ${request.number} a aprobación?`}
          description="Después de enviarla ya no se puede editar: si hay que cambiar algo, se anula y se copia."
          confirmLabel="Enviar"
          successMessage={`Solicitud ${request.number} enviada a aprobación`}
          run={() => submitPurchaseRequest(request.id)}
        />
      )}
      {can.approve && (
        <>
          <ConfirmAction
            icon={Check}
            variant="default"
            label="Aprobar"
            title={`¿Aprobar ${request.number}?`}
            description="Se le avisa por mail a quien la pidió."
            confirmLabel="Aprobar"
            successMessage={`Solicitud ${request.number} aprobada`}
            motive={{ label: 'Comentario (opcional)', placeholder: 'Para quien la pidió', required: false }}
            run={(notes) => approvePurchaseRequest(request.id, notes)}
          />
          <ConfirmAction
            icon={X}
            variant="destructive"
            label="Rechazar"
            title={`¿Rechazar ${request.number}?`}
            description="El rechazo es final: para volver a pedirla se copia como una nueva. Se le avisa por mail a quien la pidió."
            confirmLabel="Rechazar"
            successMessage={`Solicitud ${request.number} rechazada`}
            motive={{ label: 'Motivo del rechazo', placeholder: 'Obligatorio', required: true }}
            run={(notes) => rejectPurchaseRequest(request.id, notes)}
          />
        </>
      )}
      {can.cancel && (
        <ConfirmAction
          icon={Ban}
          variant="outline"
          label="Anular"
          title={`¿Anular ${request.number}?`}
          description="La solicitud queda anulada y no se puede retomar; se puede copiar como una nueva."
          confirmLabel="Anular"
          successMessage={`Solicitud ${request.number} anulada`}
          motive={{ label: 'Motivo', placeholder: 'Obligatorio', required: true }}
          run={(notes) => cancelPurchaseRequest(request.id, notes)}
        />
      )}
      {can.copy && (
        <Button type="button" size="sm" variant="outline" onClick={() => copy.mutate()} disabled={copy.isPending}>
          <Copy className="mr-1 h-4 w-4" />
          {copy.isPending ? 'Copiando…' : 'Copiar como nueva'}
        </Button>
      )}
    </div>
  );
}
