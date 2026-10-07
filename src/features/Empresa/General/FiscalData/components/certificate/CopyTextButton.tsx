'use client';

import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const logger = new Logger('FiscalData/CopyTextButton');

/** Copiar al portapapeles con el patrón de `SecretRevealPanel`: ícono Copy ↔ Check y fallback manual. */
export function CopyTextButton({
  value,
  label,
  successMessage,
}: {
  value: string;
  /** Texto visible del botón (ej. "Copiar solicitud"). */
  label: string;
  successMessage: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage);
    } catch (error) {
      logger.error('No se pudo copiar al portapapeles', { data: { error } });
      toast.error('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {label}
    </Button>
  );
}
