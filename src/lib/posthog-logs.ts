/**
 * Envío directo de logs a PostHog vía OTLP HTTP (JSON).
 *
 * Usa fetch() directo al endpoint /i/v1/logs en vez del SDK de OpenTelemetry
 * porque Turbopack en Windows no soporta serverExternalPackages (symlinks).
 * El formato es OTLP JSON estándar.
 *
 * Solo se ejecuta server-side. En el cliente, los console.warn/error
 * se capturan automáticamente vía enable_recording_console_log en session replay.
 */

type LogSeverity = 'WARN' | 'ERROR';

const SEVERITY_NUMBERS: Record<LogSeverity, number> = {
  WARN: 13,
  ERROR: 17,
};

interface OtlpAttribute {
  key: string;
  value: { stringValue: string } | { intValue: number } | { boolValue: boolean };
}

function toOtlpValue(val: string | number | boolean): OtlpAttribute['value'] {
  if (typeof val === 'number') return { intValue: val };
  if (typeof val === 'boolean') return { boolValue: val };
  return { stringValue: val };
}

/**
 * Buffer de logs pendientes para envío en batch.
 * Se vacía con flushPostHogLogs() o automáticamente al llegar a MAX_BUFFER_SIZE.
 */
const logBuffer: Array<{
  timeUnixNano: string;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: OtlpAttribute[];
}> = [];

const MAX_BUFFER_SIZE = 10;

function getConfig() {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!host || !key) return null;
  return { url: `${host}/i/v1/logs`, key };
}

/**
 * Extrae distinctId y sessionId de las cookies de PostHog en contexto de servidor.
 * Usa import dinámico de next/headers para no romper en contextos donde no está disponible.
 */
async function getUserContext(): Promise<{ distinctId?: string; sessionId?: string }> {
  try {
    const { cookies } = await import('next/headers');
    const { extractPostHogCookieData } = await import('./posthog/utils');

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const phCookie = allCookies.find((c) => /ph_phc_.*_posthog$/.test(c.name));

    if (!phCookie) return {};

    const cookieString = `${phCookie.name}=${phCookie.value}`;
    return extractPostHogCookieData(cookieString);
  } catch {
    // cookies() no disponible fuera de request context (ej: build time, scripts)
    return {};
  }
}

/**
 * Agrega un log al buffer y envía si se alcanza el tamaño máximo.
 * Extrae automáticamente el usuario de las cookies de PostHog (server-side).
 * Fire-and-forget — no bloquea la ejecución.
 */
export function sendLogToPostHog(
  severity: LogSeverity,
  message: string,
  scope?: string,
  data?: Record<string, unknown> | unknown[] | string | number | boolean | null | undefined
) {
  // Solo server-side
  if (typeof window !== 'undefined') return;

  const config = getConfig();
  if (!config) return;

  // Enriquecer con usuario de forma async (no bloquea el caller)
  void getUserContext().then(({ distinctId, sessionId }) => {
    const attributes: OtlpAttribute[] = [{ key: 'log.scope', value: { stringValue: scope ?? 'global' } }];

    // Vincular al usuario si hay datos de la cookie
    if (distinctId) {
      attributes.push({ key: 'posthog.distinct_id', value: { stringValue: distinctId } });
    }
    if (sessionId) {
      attributes.push({ key: '$session_id', value: { stringValue: sessionId } });
    }

    // Aplanar data como atributos
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          attributes.push({ key: `data.${key}`, value: toOtlpValue(val) });
        } else if (val !== null && val !== undefined) {
          attributes.push({ key: `data.${key}`, value: { stringValue: String(val) } });
        }
      }
    } else if (data !== null && data !== undefined) {
      attributes.push({ key: 'data', value: { stringValue: String(data) } });
    }

    logBuffer.push({
      timeUnixNano: `${Date.now()}000000`,
      severityNumber: SEVERITY_NUMBERS[severity],
      severityText: severity,
      body: { stringValue: message },
      attributes,
    });

    // Auto-flush si el buffer está lleno
    if (logBuffer.length >= MAX_BUFFER_SIZE) {
      void flushPostHogLogs();
    }
  });
}

/**
 * Envía todos los logs pendientes a PostHog.
 * Llamar al final de server actions o route handlers para asegurar el envío.
 */
export async function flushPostHogLogs(): Promise<void> {
  if (logBuffer.length === 0) return;

  const config = getConfig();
  if (!config) {
    logBuffer.length = 0;
    return;
  }

  // Tomar los logs del buffer y vaciarlo
  const records = logBuffer.splice(0, logBuffer.length);

  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'gh-gestion' } }],
        },
        scopeLogs: [
          {
            scope: { name: 'gh-gestion-logger' },
            logRecords: records,
          },
        ],
      },
    ],
  };

  try {
    await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silenciar errores de red para no afectar la app
  }
}
