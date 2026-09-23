'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Logger } from '@/lib/logger';
import { pdf } from '@react-pdf/renderer';
import { Download, Eye, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getDeliveryForPdf, type DeliveryPdfData } from '../actions/pdf.server';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('DeliveryReceiptButton');

// ============================================================================
// DYNAMIC IMPORTS — SSR disabled
// ============================================================================

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((mod) => mod.PDFViewer), {
  ssr: false,
});

// ============================================================================
// TYPES
// ============================================================================

interface DeliveryReceiptButtonProps {
  deliveryId: string;
  /** Optional: compact mode renders just an icon button */
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeliveryReceiptButton({ deliveryId, compact = false }: DeliveryReceiptButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deliveryData, setDeliveryData] = useState<DeliveryPdfData | null>(null);
  const [LayoutComponent, setLayoutComponent] = useState<React.ComponentType<{ data: DeliveryPdfData }> | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, layoutModule] = await Promise.all([
        getDeliveryForPdf(deliveryId),
        import('./DeliveryReceiptLayout'),
      ]);
      setDeliveryData(data);
      setLayoutComponent(() => layoutModule.DeliveryReceiptLayout);
    } catch (error) {
      logger.error('Error loading delivery data for PDF', { data: { error, deliveryId } });
      toast.error('Error al cargar los datos de la entrega');
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      setIsOpen(open);
      if (open && !deliveryData) {
        await loadData();
      }
    },
    [deliveryData, loadData]
  );

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      let data = deliveryData;
      let Layout = LayoutComponent;

      if (!data || !Layout) {
        const [fetchedData, layoutModule] = await Promise.all([
          getDeliveryForPdf(deliveryId),
          import('./DeliveryReceiptLayout'),
        ]);
        data = fetchedData;
        Layout = layoutModule.DeliveryReceiptLayout;
        setDeliveryData(data);
        setLayoutComponent(() => Layout);
      }

      const doc = <Layout data={data} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const emp = data.employees_clothing_deliveries_employee_idToemployees;
      const empName = emp ? `${emp.lastname}_${emp.firstname}` : 'empleado';
      const date = data.delivered_at
        ? new Date(data.delivered_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const link = document.createElement('a');
      link.href = url;
      link.download = `Constancia_EPP_${empName}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF descargado exitosamente');
    } catch (error) {
      logger.error('Error generating PDF', { data: { error, deliveryId } });
      toast.error('Error al generar el PDF');
    } finally {
      setIsDownloading(false);
    }
  }, [deliveryData, LayoutComponent, deliveryId]);

  return (
    <>
      <Button
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon' : 'sm'}
        onClick={() => handleOpenChange(true)}
        className={compact ? 'h-7 w-7' : 'h-7 gap-1 text-xs'}
      >
        <Eye className="h-3.5 w-3.5" />
        {!compact && <span>Ver PDF</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Constancia de Entrega EPP</DialogTitle>
            <DialogDescription>
              {deliveryData
                ? `${deliveryData.employees_clothing_deliveries_employee_idToemployees?.lastname ?? ''} ${deliveryData.employees_clothing_deliveries_employee_idToemployees?.firstname ?? ''}`
                : 'Cargando...'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && LayoutComponent && deliveryData && (
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <LayoutComponent data={deliveryData} />
              </PDFViewer>
            )}
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading || isLoading}>
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Generando...' : 'Descargar PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
