import { NextRequest } from 'next/server';
import { getReporterEmail } from '@/features/Ayuda/actions/getReporterEmail';
import { Logger } from '@/lib/logger';

const logger = new Logger('api/taskapp/events');

/**
 * Proxy SSE de los eventos de tickets de TaskApp.
 *
 * NO convertir a Server Action: es la excepción legítima a la regla "Server Actions, no
 * API routes" del repo. Las Server Actions devuelven un valor y terminan; acá se devuelve
 * el `ReadableStream` de la respuesta upstream para que el `EventSource` del navegador
 * (`features/Ayuda/hooks/useSupportTicketsRealtimeSync.ts`) lo consuma abierto. Sin route
 * handler no hay forma de streamear.
 *
 * Perímetro: la identidad del reporter sale de la sesión (`getReporterEmail()`), nunca de
 * la query, y la API key de TaskApp jamás llega al navegador.
 */
export async function GET(req: NextRequest) {
  const reporter = await getReporterEmail();
  if (!reporter) {
    return new Response('Unauthorized', { status: 401 });
  }

  const baseUrl = process.env.TASKAPP_BASE_URL;
  const apiKey = process.env.TASKAPP_PROJECT_API_KEY;

  if (!baseUrl || !apiKey) {
    logger.error('Missing TASKAPP_BASE_URL or TASKAPP_PROJECT_API_KEY');
    return new Response('Server configuration error', { status: 500 });
  }

  // getReporterEmail() returns ReporterIdentity ({ email, name })
  const reporterEmail = reporter.email;

  const upstreamUrl = `${baseUrl}/api/public/v1/events?reporter_email=${encodeURIComponent(reporterEmail)}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        'X-Project-Key': apiKey,
        Accept: 'text/event-stream',
      },
      signal: req.signal,
    });
  } catch (error) {
    logger.error('Failed to connect to TaskApp SSE', { data: { error } });
    return new Response('Upstream unavailable', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    logger.error('TaskApp SSE returned non-OK', { data: { status: upstream.status } });
    return new Response('Upstream unavailable', { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
