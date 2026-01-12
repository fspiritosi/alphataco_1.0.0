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
import { pdf } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Importación dinámica del PDFViewer
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((mod) => mod.PDFViewer), {
  ssr: false,
});

interface ChecklistPDFPreviewDialogProps {
  buttonText?: string;
  templateName: string;
  templateCode: string;
  logoUrl?: string;
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
    }>;
  }>;
  date?: string;
  revision?: string;
}

export function ChecklistPDFPreviewDialog({
  buttonText = 'Generar PDF',
  templateName,
  templateCode,
  logoUrl,
  sections,
  date,
  revision,
}: ChecklistPDFPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [PDFComponent, setPDFComponent] = useState<React.ComponentType<any> | null>(null);

  // Cargar el componente PDF cuando se abre el diálogo
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && !PDFComponent) {
      const { NormalizedChecklistPDFLayout } = await import('@/components/pdf/layouts/NormalizedChecklistPDFLayout');
      setPDFComponent(() => NormalizedChecklistPDFLayout);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Importar dinámicamente el componente del PDF
      const { NormalizedChecklistPDFLayout } = await import('@/components/pdf/layouts/NormalizedChecklistPDFLayout');

      // Crear el documento PDF
      const doc = (
        <NormalizedChecklistPDFLayout
          templateName={templateName}
          templateCode={templateCode}
          logoUrl={logoUrl}
          sections={sections}
          date={date}
          revision={revision}
          isEmpty={true}
        />
      );

      // Generar el blob del PDF
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Crear un enlace temporal y hacer clic para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateCode}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Liberar la URL del objeto
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{templateName}</DialogTitle>
          <DialogDescription>Vista previa del PDF vacío</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6">
          {PDFComponent && (
            <PDFViewer width="100%" height="100%">
              <PDFComponent
                templateName={templateName}
                templateCode={templateCode}
                logoUrl={logoUrl}
                sections={sections}
                date={date}
                revision={revision}
                isEmpty={true}
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
