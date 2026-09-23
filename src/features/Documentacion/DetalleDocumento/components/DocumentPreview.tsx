import { Card, CardDescription } from '@/components/ui/card';
import { isPdfUrl } from '@/features/Documentacion/DetalleDocumento/lib/document-detail';
import { cn } from '@/lib/utils';

/** Visor del archivo del documento: los PDF se embeben a pantalla completa. */
export function DocumentPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="max-w-[70vw] col-span-2 px-7 pb-7">
      <Card className="mt-4">
        <CardDescription className="p-3 flex justify-center">
          <embed
            src={`${fileUrl}#&navpanes=0&scrollbar=0&zoom=110`}
            className={cn('max-w-full max-h-screen rounded-xl aspect-auto', isPdfUrl(fileUrl) && 'w-full min-h-screen')}
          />
        </CardDescription>
      </Card>
    </div>
  );
}
