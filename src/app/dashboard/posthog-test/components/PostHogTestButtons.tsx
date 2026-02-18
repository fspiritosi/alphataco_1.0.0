'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabaseBrowser } from '@/lib/supabase/browser';
import posthog from 'posthog-js';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  triggerServerActionException,
  triggerServerCustomEvent,
  triggerSupabaseServer406,
  triggerSupabaseServerError,
} from '../actions/test-posthog-actions';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
  label: string;
  status: TestStatus;
  message: string;
}

const STATUS_BADGE: Record<
  TestStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
> = {
  idle: { variant: 'outline', label: 'Sin ejecutar' },
  loading: { variant: 'secondary', label: 'Ejecutando...' },
  success: { variant: 'default', label: 'OK' },
  error: { variant: 'destructive', label: 'Error capturado' },
};

export function PostHogTestButtons() {
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const setResult = (key: string, label: string, status: TestStatus, message: string) => {
    setResults((prev) => ({ ...prev, [key]: { label, status, message } }));
  };

  // --- GRUPO 1: Errores de Supabase (servidor) ---

  const handleSupabaseServerColumnError = async () => {
    const key = 'supabase_server_column';
    setResult(key, 'Supabase Server - Columna inexistente (400)', 'loading', '');
    try {
      await triggerSupabaseServerError();
      setResult(key, 'Supabase Server - Columna inexistente (400)', 'success', 'Sin error (inesperado)');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'Supabase Server - Columna inexistente (400)', 'error', msg);
      toast.error('Error de servidor capturado', { description: msg.substring(0, 80) });
    }
  };

  const handleSupabaseServer406 = async () => {
    const key = 'supabase_server_406';
    setResult(key, 'Supabase Server - 0 filas con .single() (406)', 'loading', '');
    try {
      await triggerSupabaseServer406();
      setResult(key, 'Supabase Server - 0 filas con .single() (406)', 'success', 'Sin error (inesperado)');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'Supabase Server - 0 filas con .single() (406)', 'error', msg);
      toast.error('Error 406 capturado', { description: msg.substring(0, 80) });
    }
  };

  const handleServerActionException = async () => {
    const key = 'server_action_exception';
    setResult(key, 'Server Action - Excepción directa (instrumentation)', 'loading', '');
    try {
      await triggerServerActionException();
      setResult(key, 'Server Action - Excepción directa (instrumentation)', 'success', 'Sin error (inesperado)');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'Server Action - Excepción directa (instrumentation)', 'error', msg);
      toast.error('Excepción de servidor capturada', { description: msg.substring(0, 80) });
    }
  };

  // --- GRUPO 2: Errores de Supabase (cliente) ---

  const handleSupabaseBrowserColumnError = async () => {
    const key = 'supabase_browser_column';
    setResult(key, 'Supabase Browser - Columna inexistente (400)', 'loading', '');
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from('employees').select('columna_inexistente_test').limit(1);
      if (error) {
        setResult(key, 'Supabase Browser - Columna inexistente (400)', 'error', error.message);
        toast.error('Error de cliente capturado', { description: error.message.substring(0, 80) });
      } else {
        setResult(key, 'Supabase Browser - Columna inexistente (400)', 'success', 'Sin error (inesperado)');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'Supabase Browser - Columna inexistente (400)', 'error', msg);
    }
  };

  const handleSupabaseBrowser406 = async () => {
    const key = 'supabase_browser_406';
    setResult(key, 'Supabase Browser - 0 filas con .single() (406)', 'loading', '');
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from('employees')
        .select('id')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      if (error) {
        setResult(key, 'Supabase Browser - 0 filas con .single() (406)', 'error', error.message);
        toast.error('Error 406 cliente capturado', { description: error.message.substring(0, 80) });
      } else {
        setResult(key, 'Supabase Browser - 0 filas con .single() (406)', 'success', 'Sin error (inesperado)');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'Supabase Browser - 0 filas con .single() (406)', 'error', msg);
    }
  };

  // --- GRUPO 3: Errores de JavaScript (cliente) ---

  const handleJsException = () => {
    const key = 'js_exception';
    setResult(key, 'JS Exception - captureException manual', 'loading', '');
    try {
      const error = new Error('[PostHog Test] Error de JavaScript capturado manualmente');
      posthog.captureException(error, {
        test_source: 'posthog-test-page',
        test_type: 'manual_js_exception',
      });
      setResult(key, 'JS Exception - captureException manual', 'success', 'Enviado a PostHog via captureException');
      toast.success('Excepción JS enviada a PostHog');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'JS Exception - captureException manual', 'error', msg);
    }
  };

  const handleUncaughtException = () => {
    const key = 'uncaught_exception';
    setResult(key, 'JS Exception - No capturada (capture_exceptions)', 'loading', '');
    setTimeout(() => {
      setResult(
        key,
        'JS Exception - No capturada (capture_exceptions)',
        'error',
        'Lanzada - deberia aparecer en PostHog via capture_exceptions:true'
      );
      toast.info('Excepción no capturada lanzada - revisa PostHog en ~10 segundos');
      throw new Error('[PostHog Test] Excepcion no capturada - capturada automaticamente por PostHog');
    }, 100);
  };

  // --- GRUPO 4: Eventos personalizados ---

  const handleCustomEvent = () => {
    const key = 'custom_event_client';
    setResult(key, 'Evento custom - Cliente (posthog.capture)', 'loading', '');
    posthog.capture('posthog_test_event', {
      source: 'posthog-test-page',
      type: 'client_custom_event',
      timestamp: new Date().toISOString(),
    });
    setResult(key, 'Evento custom - Cliente (posthog.capture)', 'success', 'Evento enviado a PostHog');
    toast.success('Evento custom enviado desde cliente');
  };

  const handleServerCustomEvent = async () => {
    const key = 'custom_event_server';
    setResult(key, 'Evento custom - Servidor (posthog-node)', 'loading', '');
    try {
      await triggerServerCustomEvent();
      setResult(key, 'Evento custom - Servidor (posthog-node)', 'success', 'Evento enviado via posthog-node');
      toast.success('Evento custom enviado desde servidor');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult(key, 'Evento custom - Servidor (posthog-node)', 'error', msg);
    }
  };

  const handlePageView = () => {
    const key = 'pageview';
    setResult(key, 'Pageview manual', 'loading', '');
    posthog.capture('$pageview', { path: '/dashboard/posthog-test', manual: true });
    setResult(key, 'Pageview manual', 'success', '$pageview enviado manualmente');
    toast.success('Pageview enviado');
  };

  const allResults = Object.values(results);

  return (
    <div className="space-y-6">
      {/* GRUPO 1: Errores servidor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupo 1 - Errores Supabase (Servidor)</CardTitle>
          <CardDescription>
            Capturados por el interceptor en <code>supabase/server.ts</code> via posthog-node. Aparecen como{' '}
            <code>Supabase Server Error</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleSupabaseServerColumnError} variant="destructive" size="sm">
            Columna inexistente (400)
          </Button>
          <Button onClick={handleSupabaseServer406} variant="destructive" size="sm">
            0 filas .single() (406)
          </Button>
          <Button onClick={handleServerActionException} variant="destructive" size="sm">
            Excepcion directa (instrumentation)
          </Button>
        </CardContent>
      </Card>

      {/* GRUPO 2: Errores cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupo 2 - Errores Supabase (Cliente/Browser)</CardTitle>
          <CardDescription>
            Capturados por el interceptor en <code>supabase/browser.ts</code> via posthog-js. Aparecen como{' '}
            <code>Supabase Browser Error</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleSupabaseBrowserColumnError} variant="destructive" size="sm">
            Columna inexistente (400)
          </Button>
          <Button onClick={handleSupabaseBrowser406} variant="destructive" size="sm">
            0 filas .single() (406)
          </Button>
        </CardContent>
      </Card>

      {/* GRUPO 3: JS Exceptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupo 3 - JavaScript Exceptions (Cliente)</CardTitle>
          <CardDescription>
            Capturadas por <code>posthog.captureException()</code> manual o por <code>capture_exceptions: true</code>{' '}
            automatico.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleJsException} variant="destructive" size="sm">
            captureException manual
          </Button>
          <Button onClick={handleUncaughtException} variant="destructive" size="sm">
            Excepcion no capturada (auto)
          </Button>
        </CardContent>
      </Card>

      {/* GRUPO 4: Eventos personalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupo 4 - Eventos Personalizados</CardTitle>
          <CardDescription>
            Eventos de analytics enviados via <code>posthog.capture()</code> (cliente) y{' '}
            <code>posthog-node capture()</code> (servidor).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleCustomEvent} variant="outline" size="sm">
            Evento custom (cliente)
          </Button>
          <Button onClick={handleServerCustomEvent} variant="outline" size="sm">
            Evento custom (servidor)
          </Button>
          <Button onClick={handlePageView} variant="outline" size="sm">
            Pageview manual
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {allResults.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultados de Tests</CardTitle>
              <CardDescription>Estado de cada test ejecutado en esta sesion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(results).map(([key, result]) => {
                const badge = STATUS_BADGE[result.status];
                return (
                  <div key={key} className="flex items-start gap-3 text-sm">
                    <Badge variant={badge.variant} className="shrink-0 text-xs">
                      {badge.label}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium">{result.label}</p>
                      {result.message && <p className="text-xs text-muted-foreground truncate">{result.message}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
