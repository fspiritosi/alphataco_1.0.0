'use client';

import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { unwrapAction } from '@/features/Warehouses/lib/unwrap-action';
import { useMutation } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

/** Descarga un PDF que arma el servidor en el momento (pedido de cotizacion u OC). */
export function DownloadPdfButton({
  load,
  label = 'Descargar PDF',
}: {
  load: () => Promise<ActionResult<{ filename: string; base64: string }>>;
  label?: string;
}) {
  const download = useMutation({
    mutationFn: async () => unwrapAction(await load()),
    onSuccess: ({ filename, base64 }) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo generar el PDF'),
  });

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => download.mutate()} disabled={download.isPending}>
      <FileDown className="mr-1 h-4 w-4" />
      {download.isPending ? 'Generando…' : label}
    </Button>
  );
}
