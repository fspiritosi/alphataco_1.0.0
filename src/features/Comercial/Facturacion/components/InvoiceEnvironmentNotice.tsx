import type { arca_environment } from '@/generated/prisma/enums';
import { FlaskConical, MonitorPlay } from 'lucide-react';

/**
 * Aviso estático (`role="note"`, no se anuncia) de que lo que se emite no tiene validez fiscal.
 * Mismo estilo y textos que `InvoicingNotices` de la tab. Con ARCA simulado no se suma el de
 * homologación: el de modo demo ya lo dice.
 *
 * `scope`:
 * - `draft`: el editor (lo que vas a emitir sale en el ambiente activo).
 * - `voucher`: un comprobante ya enviado (lo que importa es dónde se emitió ESE comprobante).
 */
export function InvoiceEnvironmentNotice({
  environment,
  simulated,
  scope,
}: {
  environment: arca_environment;
  simulated: boolean;
  scope: 'draft' | 'voucher';
}) {
  if (simulated) {
    return (
      <div role="note" className="border-border text-foreground flex items-start gap-3 border px-4 py-3 text-sm">
        <MonitorPlay className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 text-pretty">
          {scope === 'draft'
            ? 'ARCA simulado (modo demo): los comprobantes no se informan a ARCA y no tienen validez fiscal.'
            : 'Emitido con ARCA simulado (modo demo): no se informó a ARCA y no tiene validez fiscal.'}
        </p>
      </div>
    );
  }
  if (environment !== 'homologacion') return null;
  return (
    <div role="note" className="border-border text-foreground flex items-start gap-3 border px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-pretty">
        {scope === 'draft'
          ? 'Estás en homologación: los comprobantes que emitas son de prueba y no tienen validez fiscal.'
          : 'Comprobante de prueba (homologación): no tiene validez fiscal.'}
      </p>
    </div>
  );
}
