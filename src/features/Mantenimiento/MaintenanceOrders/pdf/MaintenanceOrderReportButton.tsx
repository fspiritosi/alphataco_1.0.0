'use client';

/**
 * Boton de descarga del PDF de una orden de mantenimiento (ticket 684).
 *
 * **Todo el costo del PDF se paga recien al hacer clic.** Ni
 * `@react-pdf/renderer` ni el layout se importan arriba: entran por
 * `import()` dinamico dentro del handler, junto con los datos. Un import
 * estatico meteria react-pdf (~700 kB) en el chunk de la tabla de ordenes, que
 * es una pantalla que se abre siempre y de la que casi nunca se imprime.
 *
 * Por lo mismo este archivo NO reexporta el layout ni los tipos: el barrel
 * `pdf/index.ts` se elimino a proposito, porque reexportar el layout junto a los
 * tipos arrastraba react-pdf al bundle de cualquiera que importara solo un tipo.
 *
 * **Se muestra en todas las ordenes, no solo en las completadas.** El paso "En
 * Taller" ya lista solo el trabajo activo y las completadas se alcanzan
 * filtrando por estado (que es justo el recorrido que describio el cliente:
 * "vengo aca en estado, busco las completas"), asi que el filtro ya cumple el
 * rol de acotar. Ademas el layout imprime la ausencia como dato ("Sin
 * registrar"), asi que una orden en curso produce un registro valido de su
 * estado a la fecha, y una accion que aparece y desaparece por fila sin
 * explicacion es peor que una que siempre esta.
 */

import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { FileDown, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getMaintenanceOrderReportData } from './actions.server';

const logger = new Logger('MaintenanceOrders/pdf/MaintenanceOrderReportButton');

interface MaintenanceOrderReportButtonProps {
  orderId: string;
  /** N.° de orden, solo para nombrar el archivo descargado. */
  orderNumber?: string | null;
}

/** Nombre de archivo seguro para Windows y legible en una carpeta de auditoria. */
function buildFileName(orderNumber: string | null | undefined): string {
  const safeNumber = (orderNumber ?? 'sin-numero').replace(/[^\w.-]+/g, '_');
  return `Orden_Mantenimiento_${safeNumber}.pdf`;
}

export function MaintenanceOrderReportButton({ orderId, orderNumber }: MaintenanceOrderReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Los datos y los dos modulos pesados viajan en paralelo: el usuario ya
      // espera, no tiene sentido encadenar la descarga del chunk con la query.
      const [data, renderer, layoutModule] = await Promise.all([
        getMaintenanceOrderReportData(orderId),
        import('@react-pdf/renderer'),
        import('./MaintenanceOrderReportLayout'),
      ]);

      const { MaintenanceOrderReportLayout: Layout } = layoutModule;
      const blob = await renderer.pdf(<Layout data={data} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildFileName(data.orderNumber || orderNumber);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF de la orden generado');
    } catch (error) {
      logger.error('Error al generar el PDF de la orden de mantenimiento', { data: { error, orderId } });
      toast.error('No se pudo generar el PDF de la orden');
    } finally {
      setIsGenerating(false);
    }
  }, [orderId, orderNumber]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isGenerating}
      title="Descargar el detalle completo de la orden en PDF"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
      PDF
    </Button>
  );
}
