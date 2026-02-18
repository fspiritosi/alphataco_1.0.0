'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logger } from '@/lib/logger';
import { sendErrorReport } from '@/lib/utils/sendErrorReport';
import { AlertTriangle, Copy, Loader2, Mail, RefreshCw } from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const logger = new Logger('AppError');

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const url = window.location.href;
    const userAgent = navigator.userAgent;
    const timestamp = new Date().toISOString();

    logger.error('Application Error', { data: { message: error.message, digest: error.digest } });

    setErrorDetails(
      `Error Message: ${error.message}\nError Digest: ${error.digest ?? 'N/A'}\nStack Trace:\n${error.stack ?? 'No stack trace available'}\nTimestamp: ${timestamp}\nUser Agent: ${userAgent}\nURL: ${url}`.trim()
    );

    // Capturar en PostHog con contexto completo — un solo useEffect en lugar de dos
    posthog.captureException(error, {
      $exception_source: 'ErrorBoundary',
      digest: error.digest ?? null,
      url,
      user_agent: userAgent,
      timestamp,
    });
  }, [error]);

  const copyErrorToClipboard = () => {
    navigator.clipboard.writeText(errorDetails);
    toast.success('Error copiado al portapapeles');
  };

  const sendErrorByEmail = async () => {
    setSending(true);
    try {
      const result = await sendErrorReport({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: window.location.href,
        userAgent: navigator.userAgent,
        source: 'Aplicacion',
      });

      if (result.success) {
        toast.success('Reporte enviado al equipo de desarrollo');
      } else {
        toast.error('No se pudo enviar el reporte', { description: result.error });
      }
    } catch {
      toast.error('Error al enviar el reporte');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-lg dark:border-gray-800">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Algo salió mal</CardTitle>
          </div>
          <CardDescription>
            Lo sentimos, ha ocurrido un error inesperado. Nuestro equipo ha sido notificado y estamos trabajando para
            solucionarlo.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 text-sm font-semibold">Detalles del error:</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground">
                ID de error: <code className="rounded bg-background px-1 py-0.5">{error.digest}</code>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <p className="mb-2 text-sm font-semibold">Información técnica completa:</p>
            <pre className="max-h-40 overflow-auto text-xs text-muted-foreground">{errorDetails}</pre>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={copyErrorToClipboard} variant="outline" className="flex-1 gap-2">
              <Copy className="h-4 w-4" />
              Copiar error
            </Button>
            <Button onClick={sendErrorByEmail} disabled={sending} variant="outline" className="flex-1 gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sending ? 'Enviando reporte...' : 'Reportar al equipo'}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} className="flex-1 gap-2" variant="default">
            <RefreshCw className="h-4 w-4" />
            Intentar nuevamente
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard')} className="flex-1" variant="outline">
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
