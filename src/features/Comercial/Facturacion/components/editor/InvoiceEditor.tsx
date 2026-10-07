'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { XCircle } from 'lucide-react';
import type { InvoiceEditorData } from '../../actions/invoices.server';
import type { EmissionOutcome } from '../../lib/emission.server';
import type { IssueProblem } from '../../lib/invoice-validation';
import { formatVoucherNumber } from '../../lib/invoice-type';
import { countLabel, invoiceHref } from '../../utils/invoice-links';
import { ArcaMessagesList } from '../ArcaMessagesList';
import { InvoiceDraftForm, type InvoicePermissions } from './InvoiceDraftForm';
import { IssueInvoiceDialog } from './IssueInvoiceDialog';
import { IssueProblemsPanel } from './IssueProblemsPanel';

type Props = {
  data: InvoiceEditorData;
  permissions: InvoicePermissions;
  /** `?resultado=` de la URL: la página viene de una emisión y el foco va al resultado. */
  result: string | null;
};

/**
 * Editor de un borrador (o de un rechazado). Este contenedor NO se vuelve a montar al guardar
 * (el form sí, con `key`): acá viven el diálogo de emisión y los paneles que tienen que sobrevivir
 * a un guardado (checklist de problemas, fallo de emisión).
 */
export function InvoiceEditor({ data, permissions, result }: Props) {
  const router = useRouter();
  const { invoice } = data;
  const [problems, setProblems] = useState<IssueProblem[]>([]);
  // Cambiar la key vuelve a montar el panel: así recibe el foco con cada intento de emitir.
  const [problemsAttempt, setProblemsAttempt] = useState(0);
  const [issueOpen, setIssueOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const issueBlockedReason = !permissions.canApprove
    ? 'Emitir requiere el permiso Aprobar en Facturación.'
    : !permissions.canViewPrices
      ? 'Emitir requiere el permiso Ver precios en Facturación.'
      : null;

  const handleProblems = useCallback((next: IssueProblem[]) => {
    setProblems(next);
    if (next.length > 0) setProblemsAttempt((n) => n + 1);
  }, []);

  const handleReadyToIssue = useCallback(() => {
    setFailure(null);
    setIssueOpen(true);
  }, []);

  const handleOutcome = (outcome: EmissionOutcome | { status: 'failed'; message: string }) => {
    setIssueOpen(false);
    const voucher = (number: number) => `${invoice.cbteLabel} ${formatVoucherNumber(invoice.salesPoint.number, number)}`;
    switch (outcome.status) {
      case 'autorizada': {
        const obs = outcome.observations.length;
        toast.success(
          obs > 0
            ? `${voucher(outcome.number)} autorizada con ${countLabel(obs, 'observación', 'observaciones')}. CAE ${outcome.cae}.`
            : `${voucher(outcome.number)} autorizada. CAE ${outcome.cae}.`
        );
        router.replace(invoiceHref(invoice.id, 'emitida'));
        return;
      }
      case 'rechazada':
        toast.error(`ARCA rechazó ${invoice.cbteLabel}: ${countLabel(outcome.errors.length, 'error', 'errores')}.`);
        router.replace(invoiceHref(invoice.id, 'rechazada'));
        return;
      case 'pendiente':
        toast.warning(`Sin respuesta de ARCA: ${voucher(outcome.number)} quedó pendiente.`);
        router.replace(invoiceHref(invoice.id, 'pendiente'));
        return;
      case 'invalid':
        handleProblems(outcome.problems);
        return;
      case 'error':
      case 'failed':
        setFailure(outcome.message);
        toast.error(`No se emitió: ${outcome.message}`);
        router.refresh();
        return;
    }
  };

  const banner = (
    <>
      {failure && (
        <div role="alert" className="border-destructive/40 text-destructive flex items-start gap-3 border px-4 py-3 text-sm">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-pretty">No se emitió el comprobante: {failure}</p>
        </div>
      )}
      {invoice.status === 'rechazada' && <ArcaRejectionPanel data={data} focus={result === 'rechazada'} />}
      <IssueProblemsPanel key={problemsAttempt} problems={problems} onDismiss={() => setProblems([])} />
    </>
  );

  return (
    <>
      <InvoiceDraftForm
        key={invoice.updatedAt}
        data={data}
        permissions={permissions}
        issueBlockedReason={issueBlockedReason}
        banner={banner}
        onProblems={handleProblems}
        onReadyToIssue={handleReadyToIssue}
      />
      <IssueInvoiceDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        invoiceId={invoice.id}
        version={invoice.updatedAt}
        issueDate={invoice.issueDate}
        certificationsCount={invoice.certifications.length}
        associatedLabel={invoice.associatedInvoice?.label ?? null}
        onOutcome={handleOutcome}
      />
    </>
  );
}

/**
 * Rechazo de ARCA, persistente mientras el comprobante siga rechazado: qué dijo ARCA (código y
 * texto tal cual) y qué hacer. El borrador se conserva entero para corregirlo y volver a emitir.
 */
function ArcaRejectionPanel({ data, focus }: { data: InvoiceEditorData; focus: boolean }) {
  const { invoice } = data;
  const focusOnMount = useCallback(
    (node: HTMLHeadingElement | null) => {
      if (focus) node?.focus();
    },
    [focus]
  );
  return (
    <section
      aria-labelledby="arca-rejection-title"
      className="border-destructive/40 text-destructive flex flex-col gap-2 border px-4 py-3 text-sm"
    >
      <h2
        id="arca-rejection-title"
        ref={focusOnMount}
        tabIndex={-1}
        className="flex items-center gap-2 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30"
      >
        <XCircle className="size-4 shrink-0" aria-hidden />
        ARCA rechazó {invoice.cbteLabel}. No se asignó número y no tiene validez.
      </h2>
      <p className="text-foreground text-pretty">Corregí lo que indica ARCA y volvé a emitir. El borrador se conserva.</p>
      {invoice.arcaErrors.length > 0 && (
        <div className="text-foreground">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">Respuesta de ARCA</p>
          <ArcaMessagesList messages={invoice.arcaErrors} />
        </div>
      )}
      {invoice.arcaObservations.length > 0 && (
        <div className="text-foreground">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">Observaciones</p>
          <ArcaMessagesList messages={invoice.arcaObservations} />
        </div>
      )}
    </section>
  );
}
