'use client';

import { Button } from '@/components/ui/button';
import { LoadingSwap } from '@/components/ui/loading-swap';
import { Logger } from '@/lib/logger';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { reconcileInvoiceAction } from '../../actions/invoice-emission.server';

const logger = new Logger('features/Comercial/Facturacion/ReconcileInvoicePanel');

/**
 * "Consultar estado en ARCA" de un comprobante pendiente. Nunca reintenta la emisión (podría
 * duplicarla): solo pregunta. El resultado queda escrito en una región `status` que existe siempre.
 */
export function ReconcileInvoicePanel({
  invoiceId,
  voucherLabel,
  canReconcile,
}: {
  invoiceId: string;
  voucherLabel: string;
  canReconcile: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const reconcile = () => {
    if (!canReconcile || pending) return;
    startTransition(async () => {
      const result = await reconcileInvoiceAction(invoiceId);
      if (!result.ok) {
        logger.warn('Falló la consulta a ARCA', { data: { invoiceId, error: result.error } });
        setMessage(`No se pudo consultar: ${result.error}`);
        return;
      }
      const outcome = result.data;
      switch (outcome.status) {
        case 'autorizada':
          toast.success(`${voucherLabel} está autorizada. CAE ${outcome.cae}.`);
          setMessage(`ARCA confirma que está autorizada. CAE ${outcome.cae}.`);
          router.refresh();
          return;
        case 'borrador':
          toast.info(outcome.message);
          setMessage(outcome.message);
          router.refresh();
          return;
        case 'revision':
          setMessage(outcome.message);
          router.refresh();
          return;
        case 'pendiente':
        case 'error':
          setMessage(outcome.message);
          return;
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant="outline"
          aria-disabled={!canReconcile}
          aria-describedby={!canReconcile ? 'reconcile-blocked-reason' : undefined}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          disabled={pending}
          onClick={reconcile}
        >
          <LoadingSwap isLoading={pending}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="size-4" aria-hidden />
              Consultar estado en ARCA
            </span>
          </LoadingSwap>
        </Button>
      </div>
      {!canReconcile && (
        <p id="reconcile-blocked-reason" className="text-muted-foreground text-xs">
          Consultar en ARCA requiere los permisos Aprobar y Ver precios en Facturación.
        </p>
      )}
      <p role="status" className="text-sm text-pretty">
        {message}
      </p>
    </div>
  );
}
