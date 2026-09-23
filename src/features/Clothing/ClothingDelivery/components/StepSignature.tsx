'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { uploadSignatureImage } from '@/features/Clothing/ClothingDelivery/actions/signature.server';
import { SignaturePad } from '@/features/Clothing/ClothingDelivery/components/SignaturePad';
import { Logger } from '@/lib/logger';
import { AlertTriangle, CheckCircle2, Loader2, Pen } from 'lucide-react';
import { useCallback, useState } from 'react';

const logger = new Logger('Clothing/StepSignature');

interface StepSignatureProps {
  signatureUrl: string | null;
  onSave: (url: string) => void;
  onClear: () => void;
}

export function StepSignature({ signatureUrl, onSave, onClear }: StepSignatureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (dataUrl: string) => {
      setIsUploading(true);
      setUploadError(null);
      logger.debug('Uploading signature');

      try {
        const result = await uploadSignatureImage(dataUrl);
        logger.info('Signature uploaded', { data: { url: result.url } });
        onSave(result.url);
      } catch (err) {
        logger.error('Error uploading signature', { data: { err } });
        setUploadError('No se pudo subir la firma. Intente nuevamente.');
      } finally {
        setIsUploading(false);
      }
    },
    [onSave]
  );

  const handleClear = useCallback(() => {
    setUploadError(null);
    onClear();
  }, [onClear]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1.5 text-foreground">Firma del empleado</p>
        <p className="text-sm text-muted-foreground mb-3">
          El empleado debe firmar en el panel a continuacion para confirmar la recepcion.
        </p>
      </div>

      {/* Upload error */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border bg-muted/40 p-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Guardando firma...</span>
        </div>
      )}

      {/* Signature confirmed */}
      {signatureUrl && !isUploading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Firma registrada</p>
              <p className="text-xs text-green-700 dark:text-green-400">La firma fue guardada correctamente</p>
            </div>
            <Badge
              variant="outline"
              className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 gap-1"
            >
              <Pen className="h-3 w-3" />
              OK
            </Badge>
          </div>

          {/* Signature preview */}
          <div className="rounded-lg border overflow-hidden bg-white dark:bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureUrl} alt="Firma del empleado" className="w-full h-40 object-contain p-2" />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Para cambiar la firma, dibuje una nueva abajo y confirme.
          </p>
        </div>
      )}

      {/* Signature pad — always visible so user can redraw */}
      {!isUploading && <SignaturePad onSave={handleSave} onClear={handleClear} />}

      {/* Required note */}
      {!signatureUrl && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Debe registrar la firma del empleado para poder continuar con la entrega.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
