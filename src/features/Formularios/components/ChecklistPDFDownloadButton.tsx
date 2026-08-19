'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import { pdf } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Importación dinámica del PDFViewer
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((mod) => mod.PDFViewer), {
  ssr: false,
});

interface ChecklistPDFDownloadButtonProps {
  templateName: string;
  templateCode: string;
  sections: Array<{
    id: string;
    code: string;
    name: string;
    order_index: number;
    checklist_template_items: Array<{
      id: string;
      code: string;
      label: string;
      order_index: number;
      is_critical?: boolean;
      requires_side_validation?: boolean;
      input_type?: string;
    }>;
  }>;
  // Datos del equipo
  dominio?: string;
  tipoEquipo?: string;
  fluidoTransportable?: string;
  cliente?: string;
  // Datos de la inspección
  observaciones?: string;
  fechaInspeccion?: string;
  // Nombre del chofer (TODO: reemplazar por imagen de firma cuando esté disponible)
  chofer?: string;
  // Respuestas del checklist (formato: { section_code: { item_code: value | { left, right } } })
  answers?: Record<string, Record<string, string | { left: string; right: string }>>;
  /** Observaciones por item, indexadas por `seccion__item` */
  itemObservations?: Record<string, string>;
  // Datos adicionales
  date?: string;
  revision?: string;
}

export function ChecklistPDFDownloadButton({
  templateName,
  templateCode,
  sections,
  dominio = '',
  tipoEquipo = '',
  fluidoTransportable = '',
  cliente = '',
  observaciones = '',
  fechaInspeccion = '',
  chofer = '',
  answers = {},
  itemObservations = {},
  date,
  revision,
}: ChecklistPDFDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [PDFComponent, setPDFComponent] = useState<React.ComponentType<any> | null>(null);

  const logoUrl = 'https://vvrckjjyrwqzpbaatemz.supabase.co/storage/v1/object/public/logo/30709694363.png';

  // Transformar answers al formato que espera el PDF (flat con sufijos _left/_right)
  const flattenedAnswers = flattenAnswers(answers);

  // Cargar el componente PDF cuando se abre el diálogo
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && !PDFComponent) {
      const { NormalizedChecklistPDFLayout } = await import(
        '@/features/Formularios/pdf/layouts/NormalizedChecklistPDFLayout'
      );
      setPDFComponent(() => NormalizedChecklistPDFLayout);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const { NormalizedChecklistPDFLayout } = await import(
        '@/features/Formularios/pdf/layouts/NormalizedChecklistPDFLayout'
      );

      const doc = (
        <NormalizedChecklistPDFLayout
          templateName={templateName}
          templateCode={templateCode}
          logoUrl={logoUrl}
          sections={sections}
          dominio={dominio}
          tipoEquipo={tipoEquipo}
          fluidoTransportable={fluidoTransportable}
          cliente={cliente}
          observaciones={observaciones}
          fechaInspeccion={fechaInspeccion}
          chofer={chofer}
          date={date}
          revision={revision}
          isEmpty={false}
          answers={flattenedAnswers}
          itemObservations={itemObservations}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const sanitizedName = templateName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').replace(/\s+/g, '_');
      link.download = `Checklist_${sanitizedName}_${dominio || 'sin_dominio'}_${fechaInspeccion || new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error al generar PDF', { data: { error } });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Descargar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{templateName}</DialogTitle>
          <DialogDescription>
            Vista previa del PDF - {dominio} - {fechaInspeccion}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6">
          {PDFComponent && (
            <PDFViewer width="100%" height="100%">
              <PDFComponent
                templateName={templateName}
                templateCode={templateCode}
                logoUrl={logoUrl}
                sections={sections}
                dominio={dominio}
                tipoEquipo={tipoEquipo}
                fluidoTransportable={fluidoTransportable}
                cliente={cliente}
                observaciones={observaciones}
                fechaInspeccion={fechaInspeccion}
                chofer={chofer}
                date={date}
                revision={revision}
                isEmpty={false}
                answers={flattenedAnswers}
                itemObservations={itemObservations}
              />
            </PDFViewer>
          )}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Transforma el formato de answers del backend al formato plano que espera el PDF
 * Input: { section_code: { item_code: "B" | { left: "B", right: "M" } } }
 * Output: { "item_code": "B", "item_code_left": "B", "item_code_right": "M" }
 */
function flattenAnswers(
  answers: Record<string, Record<string, string | { left: string; right: string }>>
): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const sectionCode in answers) {
    const sectionAnswers = answers[sectionCode];
    for (const itemCode in sectionAnswers) {
      const value = sectionAnswers[itemCode];
      if (typeof value === 'object' && value !== null && 'left' in value && 'right' in value) {
        // Item con side validation
        flattened[`${itemCode}_left`] = value.left;
        flattened[`${itemCode}_right`] = value.right;
      } else if (typeof value === 'string') {
        // Item normal
        flattened[itemCode] = value;
      }
    }
  }

  return flattened;
}
