'use client';

import { Button } from '@/components/ui/button';
import { CertificationAmount } from '@/features/Comercial/Certificaciones/components/CertificationAmount';
import type { VoucherLetter } from '@/shared/lib/arca/catalogs';
import { useDeferredValue, useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { previewTotals, type EditorValues } from './editor-form';

/**
 * Barra inferior en pantallas angostas (< lg): el total y "Emitir" siempre a mano mientras se
 * cargan líneas. En desktop no hace falta: la columna lateral es sticky.
 */
export function MobileIssueBar({
  control,
  letter,
  currency,
  blocked,
  onIssue,
}: {
  control: Control<EditorValues>;
  letter: VoucherLetter;
  currency: string;
  blocked: boolean;
  onIssue: () => void;
}) {
  const lines = useWatch({ control, name: 'lines' });
  const deferredLines = useDeferredValue(lines);
  const total = useMemo(() => previewTotals(deferredLines, letter).totals.total, [deferredLines, letter]);

  return (
    <div className="bg-background sticky bottom-0 z-10 -mx-6 flex items-center justify-between gap-3 border-t px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <p className="text-sm">
        <span className="text-muted-foreground">Total </span>
        <span className="font-semibold whitespace-nowrap">
          <CertificationAmount value={total} currency={currency} />
        </span>
      </p>
      <Button
        type="button"
        variant="brand"
        aria-disabled={blocked}
        className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        onClick={onIssue}
      >
        Emitir
      </Button>
    </div>
  );
}
