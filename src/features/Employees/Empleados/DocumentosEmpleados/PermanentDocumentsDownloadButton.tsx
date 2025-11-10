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
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

export function PermanentDocumentsDownloadButton({ table }: { table: any }) {
  // Aquí puedes personalizar la lógica de descarga si lo necesitas
  const supabase = supabaseBrowser();

  // Helper para obtener el nombre del recurso (empleado o vehículo)
  const getResourceName = (doc: any) => {
    if (doc.employees) {
      return `${doc.employees.firstname} ${doc.employees.lastname}`;
    } else if (doc.vehicles) {
      return doc.vehicles.domain || doc.vehicles.serie || 'Equipo';
    }
    return 'Recurso';
  };

  const handleDownloadAll = async () => {
    toast.promise(
      async () => {
        const zip = new JSZip();
        const documentToDownload = table
          .getFilteredRowModel()
          .rows.map((row: any) => row.original)
          .filter((row: any) => row.state !== 'pendiente') as any;

        const files = await Promise.all(
          documentToDownload?.map(async (doc: any) => {
            const { data, error } = await supabase.storage.from('document-files').download(doc.document_path);

            if (error) {
              throw new Error(handleSupabaseError(error.message));
            }

            // Extrae la extensión del archivo del document_path
            const extension = doc.document_url.split('.').pop();

            return {
              data,
              name: `${doc.resource}-(${doc?.documentName}).${extension}`,
            };
          }) || []
        );

        files.forEach((file) => {
          zip.file(file.name, file.data);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'documents.zip');
      },
      {
        loading: 'Descargando documentos...',
        success: 'Documentos descargados',
        error: (error) => {
          return error;
        },
      }
    );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={
            table.getFilteredRowModel().rows.filter((row: any) => row.original.state !== 'pendiente')?.length === 0
          }
          className="ml-6"
          size="sm"
          variant={'outline'}
        >
          <DownloadIcon className="size-4 mr-2" />
          Descargar Documentos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Estas a punto de descargar{' '}
            {table.getFilteredRowModel().rows.filter((row: any) => row.original.state !== 'pendiente')?.length}{' '}
            documentos
          </AlertDialogTitle>
          <AlertDialogDescription className="max-h-[65vh] overflow-y-auto">
            {table.getFilteredRowModel().rows.filter((row: any) => row.original.state === 'pendiente')?.length > 0 && (
              <div>
                <CardDescription className="underline">
                  Alerta: Hay documentos que estan pendientes y no se descargarán
                </CardDescription>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-red-600">
                      {
                        table.getFilteredRowModel().rows.filter((row: any) => row.original.state === 'pendiente')
                          ?.length
                      }{' '}
                      Documentos pendientes
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-2">
                        {table
                          .getFilteredRowModel()
                          .rows.filter((row: any) => row.original.state === 'pendiente')
                          .map((row: any) => (
                            <Card className="p-2 border-red-300" key={row.id}>
                              <CardDescription>
                                {getResourceName(row.original)} ({(row.original as any).document_types.name})
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
                <AccordionTrigger className="text-green-600">
                  {' '}
                  {
                    table.getFilteredRowModel().rows.filter((row: any) => row.original.state !== 'pendiente')?.length
                  }{' '}
                  Documentos presentados
                </AccordionTrigger>
                <AccordionContent>
                  <div className=" flex flex-col gap-2 mt-2">
                    {table
                      .getFilteredRowModel()
                      .rows.filter((row: any) => row.original.state !== 'pendiente')
                      .map((row: any) => {
                        return (
                          <Card className="p-2 border-green-600" key={row.id}>
                            <CardDescription>
                              {getResourceName(row.original)} ({(row.original as any).document_types.name})
                            </CardDescription>
                          </Card>
                        );
                      })}
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
