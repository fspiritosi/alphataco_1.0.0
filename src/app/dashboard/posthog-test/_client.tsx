'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePostHog as usePostHogHook } from 'posthog-js/react';
import { useState } from 'react';
import { testAuthError, testCustomEvent, testStandardError, testSupabaseError, testUnhandledError } from './_actions';

type TestResult = {
  id: string;
  label: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
  timestamp: string;
};

function StatusBadge({ status }: { status: TestResult['status'] }) {
  const variants: Record<TestResult['status'], { label: string; className: string }> = {
    pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-700' },
    running: { label: 'Ejecutando...', className: 'bg-blue-100 text-blue-700' },
    success: { label: 'OK', className: 'bg-green-100 text-green-700' },
    error: { label: 'Error capturado', className: 'bg-red-100 text-red-700' },
  };
  const v = variants[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

function ResultRow({ result }: { result: TestResult }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <StatusBadge status={result.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{result.label}</p>
        {result.message && <p className="text-xs text-muted-foreground mt-0.5 break-all font-mono">{result.message}</p>}
        <p className="text-xs text-muted-foreground/70 mt-0.5">{result.timestamp}</p>
      </div>
    </div>
  );
}

export function PostHogTestClient() {
  const posthog = usePostHogHook();
  const [results, setResults] = useState<TestResult[]>([]);
  const [crashMode, setCrashMode] = useState(false);

  const addResult = (id: string, label: string): ((update: Partial<TestResult>) => void) => {
    const timestamp = new Date().toLocaleTimeString('es');
    setResults((prev) => [
      { id, label, status: 'running', message: '', timestamp },
      ...prev.filter((r) => r.id !== id),
    ]);
    return (update) => {
      setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
    };
  };

  // ── Pruebas del CLIENTE ───────────────────────────────────────────────────

  const handleClientError = () => {
    const update = addResult('client-error', 'Error JS cliente (throw en click handler)');
    try {
      // Error intencional
      const obj = null as unknown as { prop: string };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = obj.prop; // TypeError
    } catch (err) {
      posthog?.captureException(err instanceof Error ? err : new Error(String(err)), {
        $exception_source: 'PostHogTestPage',
        test_type: 'client_js_error',
      });
      update({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleUnhandledClientError = () => {
    addResult('unhandled-client', 'Error NO manejado — activa error.tsx');
    // Este error no está en try/catch — activa el Error Boundary de la página
    // Se captura con capture_exceptions: true
    setTimeout(() => {
      throw new Error('Error de prueba PostHog — NO manejado, debería activar error.tsx');
    }, 100);
  };

  const handleClientEvent = () => {
    const update = addResult('client-event', 'Evento personalizado cliente');
    try {
      const sessionId = posthog?.get_session_id();
      const distinctId = posthog?.get_distinct_id();
      posthog?.capture('posthog_test_event', {
        test_type: 'custom_client_event',
        source: 'posthog-test-page',
        session_id_check: sessionId ?? 'no disponible',
        distinct_id_check: distinctId ?? 'no disponible',
        triggered_at: new Date().toISOString(),
      });
      update({
        status: 'success',
        message: `Evento enviado — session: ${sessionId ?? 'null'}, distinct: ${distinctId ?? 'null'}`,
      });
    } catch (err) {
      update({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  // ── Pruebas del SERVIDOR ──────────────────────────────────────────────────

  const handleServerStandardError = async () => {
    const update = addResult('server-standard', 'Error JS estándar en Server Action');
    const result = await testStandardError();
    update({ status: result.ok ? 'success' : 'error', message: result.message });
  };

  const handleSupabaseError = async () => {
    const update = addResult('server-supabase', 'Error Supabase (query inválida)');
    const result = await testSupabaseError();
    update({ status: result.ok ? 'success' : 'error', message: result.message });
  };

  const handleAuthError = async () => {
    const update = addResult('server-auth', 'Consulta Supabase con posible RLS');
    const result = await testAuthError();
    update({ status: result.ok ? 'success' : 'error', message: result.message });
  };

  const handleServerCustomEvent = async () => {
    const update = addResult('server-event', 'Evento personalizado desde servidor');
    const result = await testCustomEvent({ eventName: 'posthog_test_server_event' });
    update({ status: result.ok ? 'success' : 'error', message: result.message });
  };

  const handleUnhandledServerError = async () => {
    addResult('server-unhandled', 'Error NO manejado en Server Action');
    try {
      await testUnhandledError();
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.id === 'server-unhandled'
            ? { ...r, status: 'error', message: 'Error capturado por captureServerActionError + relanzado' }
            : r
        )
      );
    }
  };

  if (crashMode) {
    // Esto activa el Global Error Boundary (global-error.tsx)
    throw new Error('CRASH INTENCIONAL — prueba de global-error.tsx con PostHog');
  }

  const sessionId = posthog?.get_session_id();
  const distinctId = posthog?.get_distinct_id();
  const isLoaded = posthog?.__loaded ?? false;

  return (
    <div className="space-y-6">
      {/* Estado de PostHog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de PostHog (cliente)</CardTitle>
          <CardDescription>Información del SDK en tiempo real</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-32">Inicializado:</span>
            <Badge variant={isLoaded ? 'default' : 'destructive'}>{isLoaded ? 'SÍ' : 'NO'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-32">distinct_id:</span>
            <span className="text-xs break-all">{distinctId ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-32">session_id:</span>
            <span className="text-xs break-all">{sessionId ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pruebas CLIENTE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Errores del Cliente</CardTitle>
            <CardDescription>
              Capturados via <code className="text-xs">capture_exceptions</code> y{' '}
              <code className="text-xs">captureException</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={handleClientError}>
              TypeError en click handler (manejado)
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleClientEvent}>
              Evento personalizado con session_id
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleUnhandledClientError}>
              Error NO manejado → activa error.tsx
            </Button>
            <Separator />
            <Button variant="destructive" className="w-full justify-start" onClick={() => setCrashMode(true)}>
              CRASH total → activa global-error.tsx
            </Button>
          </CardContent>
        </Card>

        {/* Pruebas SERVIDOR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Errores del Servidor</CardTitle>
            <CardDescription>
              Capturados via <code className="text-xs">captureServerActionError</code> y{' '}
              <code className="text-xs">onRequestError</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={handleServerStandardError}>
              Error JS estándar en Server Action
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleSupabaseError}>
              Query Supabase inválida (PostgrestError)
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleAuthError}>
              Consulta Supabase con RLS
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleServerCustomEvent}>
              Evento personalizado desde servidor
            </Button>
            <Separator />
            <Button variant="destructive" className="w-full justify-start" onClick={handleUnhandledServerError}>
              Error NO manejado en Server Action
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados</CardTitle>
            <CardDescription>
              Los errores deberían aparecer en PostHog en ~30 segundos.{' '}
              <a
                href="https://us.posthog.com/project/211988/error_tracking"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Abrir Error Tracking en PostHog →
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.map((r) => (
              <ResultRow key={r.id} result={r} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
