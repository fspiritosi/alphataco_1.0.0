'use client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { getDocumentDownloadUrls } from '@/features/Documentacion/shared/actions/document-files.server';
import type { Table } from '@tanstack/react-table';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { DownloadIcon } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

/**
 * Lo mínimo que necesita una fila de documentos (empleados o equipos) para descargarse.
 * El botón vive en la toolbar genérica, así que las filas se validan en runtime.
 */
interface DownloadableDocumentRow {
  state?: string | null;
  document_path?: string | null;
  document_types?: { name?: string | null } | null;
  employees?: { firstname?: string | null; lastname?: string | null } | null;
  vehicles?: { domain?: string | null; serie?: string | null } | null;
}

function isDocumentRow(value: unknown): value is DownloadableDocumentRow {
  return typeof value === 'object' && value !== null && 'state' in value;
}

// Nombre del recurso (empleado o equipo) para el archivo dentro del ZIP.
function getResourceName(doc: DownloadableDocumentRow): string {
  if (doc.employees) return `${doc.employees.firstname ?? ''} ${doc.employees.lastname ?? ''}`.trim() || 'Empleado';
  if (doc.vehicles) return doc.vehicles.domain || doc.vehicles.serie || 'Equipo';
  return 'Recurso';
}

export function PermanentDocumentsDownloadButton<TData>({ table }: { table: Table<TData> }) {
  const rows = table.getFilteredRowModel().rows;

  const { pending, presented } = useMemo(() => {
    const documents = rows.map((row): unknown => row.original).filter(isDocumentRow);
    return {
      pending: documents.filter((doc) => doc.state === 'pendiente'),
      presented: documents.filter((doc) => doc.state !== 'pendiente' && !!doc.document_path),
    };
  }, [rows]);

  const handleDownloadAll = async () => {
    toast.promise(
      async () => {
        const zip = new JSZip();

        // Las resuelve el servidor: sólo devuelve documentos de la empresa activa.
        const paths = presented.map((doc) => doc.document_path).filter((path): path is string => !!path);
        const signedUrls = new Map((await getDocumentDownloadUrls(paths)).map((item) => [item.path, item.url]));

        const files = await Promise.all(
          presented.map(async (doc) => {
            const path = doc.document_path;
            if (!path) return null;
            const url = signedUrls.get(path);
            if (!url) throw new Error('No se pudo generar el enlace de descarga');
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo descargar el documento');
            const extension = path.split('.').pop();
            return {
              data: await response.blob(),
              name: `${getResourceName(doc)}-(${doc.document_types?.name ?? 'documento'}).${extension}`,
            };
          })
        );

        for (const file of files) {
          if (file) zip.file(file.name, file.data);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'documents.zip');
      },
      {
        loading: 'Descargando documentos...',
        success: 'Documentos descargados',
        error: (error) => (error instanceof Error ? error.message : 'Error al descargar documentos'),
      }
    );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={presented.length === 0} className="ml-6" size="sm" variant={'outline'}>
          <DownloadIcon className="size-4 mr-2" />
          Descargar Documentos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Estas a punto de descargar {presented.length} documentos</AlertDialogTitle>
          <AlertDialogDescription className="max-h-[65vh] overflow-y-auto">
            {pending.length > 0 && (
              <div>
                <CardDescription className="underline">
                  Alerta: Hay documentos que estan pendientes y no se descargarán
                </CardDescription>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-red-600">{pending.length} Documentos pendientes</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-2">
                        {pending.map((doc, index) => (
                          <Card className="p-2 border-red-300" key={`pending-${index}`}>
                            <CardDescription>
                              {getResourceName(doc)} ({doc.document_types?.name ?? 'documento'})
                            </CardDescription>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-green-600">{presented.length} Documentos presentados</AccordionTrigger>
                <AccordionContent>
                  <div className=" flex flex-col gap-2 mt-2">
                    {presented.map((doc, index) => (
                      <Card className="p-2 border-green-600" key={`presented-${index}`}>
                        <CardDescription>
                          {getResourceName(doc)} ({doc.document_types?.name ?? 'documento'})
                        </CardDescription>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleDownloadAll();
            }}
          >
            Descargar documentos
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
