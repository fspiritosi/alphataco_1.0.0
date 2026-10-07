'use client';

import { Button } from '@/components/ui/button';
import { LoadingSwap } from '@/components/ui/loading-swap';
import { Logger } from '@/lib/logger';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { regenerateInvoicePdf } from '../../actions/invoice-emission.server';

const logger = new Logger('features/Comercial/Facturacion/InvoicePdfActions');

/** El PDF se genera después de autorizar: se vuelve a leer la página unas veces hasta que aparece. */
const POLL_EVERY_MS = 3000;
const POLL_MAX_TRIES = 10;

type Props = {
  invoiceId: string;
  voucherLabel: string;
  hasPdf: boolean;
  pdfUrl: string | null;
  pdfDownloadUrl: string | null;
  canRegenerate: boolean;
  /** Recién autorizada: el PDF se está generando y conviene esperarlo. Si no, se ofrece generarlo. */
  waitForPdf: boolean;
};

/**
 * Ver / descargar el PDF. Tres estados: listo (links reales), generándose (se espera unos segundos
 * releyendo la página) y no generado (botón "Generar PDF"). El CAE nunca depende del PDF.
 */
export function InvoicePdfActions({ invoiceId, voucherLabel, hasPdf, pdfUrl, pdfDownloadUrl, canRegenerate, waitForPdf }: Props) {
  const router = useRouter();
  const [generating, startGenerating] = useTransition();
  const [gaveUp, setGaveUp] = useState(!waitForPdf);
  const tries = useRef(0);

  // Sincronización con un proceso externo (la generación del PDF en el servidor, en `after()`).
  useEffect(() => {
    if (hasPdf || gaveUp) return;
    const timer = setInterval(() => {
      tries.current += 1;
      if (tries.current > POLL_MAX_TRIES) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, POLL_EVERY_MS);
    return () => clearInterval(timer);
  }, [hasPdf, gaveUp, router]);

  const regenerate = () => {
    startGenerating(async () => {
      const result = await regenerateInvoicePdf(invoiceId);
      if (!result.ok) {
        logger.warn('No se generó el PDF', { data: { invoiceId, error: result.error } });
        toast.error(`No se generó el PDF: ${result.error}`);
        return;
      }
      toast.success(`PDF de ${voucherLabel} generado.`);
      router.refresh();
    });
  };

  if (hasPdf && pdfUrl && pdfDownloadUrl) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="brand">
          <a href={pdfDownloadUrl} download>
            <Download aria-hidden />
            Descargar PDF
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={pdfUrl} target="_blank" rel="noopener">
            <ExternalLink aria-hidden />
            Ver PDF
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
        {gaveUp ? (
          'El PDF todavía no está. El comprobante está autorizado igual: podés generarlo ahora.'
        ) : (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Generando PDF…
          </>
        )}
      </p>
      {canRegenerate && (
        <div>
          <Button type="button" variant="outline" disabled={generating} onClick={regenerate}>
            <LoadingSwap isLoading={generating}>Generar PDF</LoadingSwap>
          </Button>
        </div>
      )}
    </div>
  );
}
