'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Download, FileText, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DailyReportRow } from './DayliReportDetailTable';
import HistoryModal from './HistoryModal';

export type DocumentData = {
  id: string;
  date: string;
  customer: string;
  employees: string[];
  equipment: string[];
  services: string;
  item: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  working_day: string;
  sector_customer_id: string;
  sector_customer_name: string;
  areas_customer_id: string;
  areas_customer_name: string;
  description: string;
  remit_number: string;
  document_path: string | null;
  employees_references: {
    name: string;
    id: string;
  }[];
  equipment_references: {
    name: string;
    id: string;
  }[];
};

// Componente para visualizar documentos
const DocumentViewer = ({ documentType, documentUrl }: { documentType: 'pdf' | 'image'; documentUrl: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Establecer el ancho del viewport al montar el componente
    setViewportWidth(window.innerWidth);

    // Actualizar el ancho del viewport cuando cambie el tamaño de la ventana
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoadError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Calcular el ancho óptimo para el documento
  const getOptimalWidth = () => {
    // En móviles, usar un porcentaje más alto del viewport
    if (viewportWidth < 768) {
      return Math.min(viewportWidth * 0.85, 500);
    }
    // En pantallas más grandes, limitar el ancho máximo
    return Math.min(viewportWidth * 0.5, 600);
  };

  if (hasError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No se pudo cargar el documento. Por favor, inténtelo de nuevo más tarde.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full border rounded-md overflow-hidden bg-muted/20">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <Skeleton className="h-[300px] w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
      )}

      {documentType === 'pdf' ? (
        <div className="w-full h-[calc(80vh-120px)] overflow-hidden p-2">
          <iframe
            ref={iframeRef}
            src={`${documentUrl}#toolbar=0&navpanes=0`}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={handleLoadError}
            title="PDF Viewer"
          />
        </div>
      ) : (
        <div className="w-full h-[calc(80vh-120px)] flex items-center justify-center overflow-auto p-2">
          <div className="relative max-w-full max-h-full">
            <Image
              src={documentUrl || '/placeholder.svg'}
              alt="Documento"
              width={getOptimalWidth()}
              height={getOptimalWidth() * 1.2}
              className="object-contain"
              onLoad={() => setIsLoading(false)}
              onError={handleLoadError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para mostrar información del documento
const DocumentInfo = ({ document }: { document: DailyReportRow }) => {
  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/10 overflow-auto max-h-[calc(80vh-120px)]">
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold">Información del documento</h3>
        <Badge className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium w-fit">
          Remito: {document.remit_number}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Cliente</p>
          <p className="text-sm">{document.customer}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Fecha</p>
          <p className="text-sm">{document.date}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Servicio</p>
          <p className="text-sm">{document.services}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Estado</p>
          <p className="text-sm capitalize">{document.status}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Sector</p>
          <p className="text-sm">{document.sector_service_name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Área</p>
          <p className="text-sm">{document.areas_customer_name}</p>
        </div>
        {document.customer_equipment.length ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Equipos cliente</p>
            <ul className="text-sm list-disc list-inside">
              {document.customer_equipment.map((equipment) => (
                <li className="uppercase" key={equipment.id}>
                  {equipment.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {document.employees_references.length ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Empleados</p>
            <ul className="text-sm list-disc list-inside">
              {document.employees_references.map((employee) => (
                <li className="capitalize" key={employee.id}>
                  {employee.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {document.equipment_references.length ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Equipamiento</p>
            <ul className="text-sm list-disc list-inside">
              {document.equipment_references.map((equipment) => (
                <li className="uppercase" key={equipment.id}>
                  {equipment.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {document.description && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Descripción</p>
            <p className="text-sm capitalize">{document.description}</p>
          </div>
        )}
        <div>
          <p className="text-sm capitalize font-medium text-muted-foreground">Jornada</p>
          <p className="text-sm capitalize">{document.working_day}</p>
        </div>
        <div>
          <p className="text-sm capitalize font-medium text-muted-foreground">Tipo de servicio</p>
          <p className="text-sm capitalize ">{document.type_service}</p>
        </div>
      </div>
    </div>
  );
};

// Componente principal
export default function DocumentViewerModal({
  documentUrl,
  documentData,
}: {
  documentUrl: string;
  documentData: DailyReportRow;
}) {
  const [open, setOpen] = useState(false);

  // Determinar el tipo de documento basado en la extensión de la URL
  const getDocumentType = (url: string): 'pdf' | 'image' => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') {
      return 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    // Si no se puede determinar, intentar adivinar por el contenido de la URL
    return url.includes('pdf') ? 'pdf' : 'image';
  };

  const documentType = getDocumentType(documentUrl);

  const handleOpenDocument = () => {
    setOpen(true);
  };
  const handleDownload = async () => {
    try {
      // Hacer fetch del archivo directamente desde la URL
      const response = await fetch(documentData.document_path!);
      if (!response.ok) throw new Error('No se pudo obtener el archivo');

      // Obtener el blob del archivo
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Crear un enlace temporal para la descarga
      const a = document.createElement('a');
      a.href = blobUrl;

      // Obtener la extensión del archivo de la URL o usar el tipo de documento
      const extension =
        documentData.document_path!.split('.').pop()?.split('?')[0]?.toLowerCase() ||
        (documentType === 'pdf' ? 'pdf' : 'jpg');

      // Crear el nombre del archivo
      const fileName = `remito_${documentData.remit_number || 'sin_numero'}.${extension}`;

      // Configurar y disparar la descarga
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Limpiar
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      toast.error('Error al descargar el archivo');
    }
  };
  return (
    <div className=" space-y-6">
      <Button onClick={handleOpenDocument} className="flex items-center gap-2">
        {documentType === 'pdf' ? (
          <>
            <FileText className="h-4 w-4" />
            Ver PDF
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4" />
            Ver Imagen
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex flex-col  gap-2">
              {documentType === 'pdf' ? (
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Visualización de PDF
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Visualización de Imagen
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Descargar documento
                </Button>
                <HistoryModal dailyReportRowId={documentData.id} onlyIcon={true} />
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
            <div className="lg:col-span-2">
              <DocumentViewer documentType={documentType} documentUrl={documentUrl} />
            </div>
            <div className="lg:col-span-1">
              <DocumentInfo document={documentData} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
