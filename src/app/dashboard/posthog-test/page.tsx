import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PostHogTestClient } from './_client';

export const metadata = {
  title: 'PostHog Test | Dashboard',
  description: 'Pagina de prueba para verificar la integracion de PostHog',
};

export default function PostHogTestPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PostHog Test</h1>
        <p className="text-muted-foreground mt-1">
          Pagina para disparar errores y eventos de prueba y verificar que llegan correctamente a PostHog DEV.
        </p>
      </div>

      <Separator />

      <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-800 dark:text-amber-300">Instrucciones de uso</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p>1. Abre PostHog DEV en otra pestana: Error Tracking → Activity</p>
          <p>2. Ejecuta los botones del cliente y del servidor</p>
          <p>3. Los errores del servidor tardan ~5-15 segundos en aparecer en PostHog</p>
          <p>4. Los errores del cliente son casi inmediatos (proxy /ingest)</p>
        </CardContent>
      </Card>

      <Card className="border-blue-400 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-800 dark:text-blue-300">Que verificar en PostHog</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <p>
            <strong>Errores Supabase Server</strong>: Tipo <code>SupabaseServerError</code> con <code>url</code>,{' '}
            <code>method</code>, <code>status</code>, <code>response_body</code>
          </p>
          <p>
            <strong>Errores Supabase Browser</strong>: Tipo <code>SupabaseBrowserError</code> con los mismos campos
          </p>
          <p>
            <strong>JS Exceptions</strong>: Stack trace completo, capturadas por <code>capture_exceptions: true</code>
          </p>
          <p>
            <strong>distinct_id</strong>: Debe ser el ID del usuario real de Supabase (no UUID anonimo)
          </p>
          <p>
            <strong>Evento custom</strong>: Buscar <code>posthog_test_event</code> en Live Events
          </p>
        </CardContent>
      </Card>

      <PostHogTestClient />
    </div>
  );
}
