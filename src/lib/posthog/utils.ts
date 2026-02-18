/**
 * Utilidades compartidas para PostHog.
 * Usadas tanto en el servidor (posthog-node) como en el cliente (posthog-js).
 */

/** Resultado de extraer datos de la cookie de PostHog */
export type PostHogCookieData = {
  distinctId: string | undefined;
  sessionId: string | undefined;
};

/**
 * Extrae el distinctId y sessionId de las cookies de PostHog.
 * Funciona en el servidor: recibe el string de cookies de la request.
 */
export function extractPostHogCookieData(cookieString: string): PostHogCookieData {
  let distinctId: string | undefined;
  let sessionId: string | undefined;

  // Cookie principal: ph_phc_XXX_posthog
  const mainCookieMatch = cookieString.match(/ph_phc_[^=]+=([^;]+)/);
  if (mainCookieMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(mainCookieMatch[1]);
      const data = JSON.parse(decoded);
      distinctId = data.distinct_id ?? undefined;
      // El session_id en posthog-js se guarda como $sesid: [startTimestamp, sessionId, activityTimestamp]
      // Formato interno confirmado: phData.$sesid?.[1]
      // Fallback a $session_id / session_id por compatibilidad con versiones anteriores
      sessionId = data.$sesid?.[1] ?? data.$session_id ?? data.session_id ?? undefined;
    } catch {
      // Silenciar — cookie malformada
    }
  }

  // Cookie de sesión: ph_phc_XXX_posthog_session (si existe)
  if (!sessionId) {
    const sessionCookieMatch = cookieString.match(/ph_phc_[^=]+_session=([^;]+)/);
    if (sessionCookieMatch?.[1]) {
      try {
        const decoded = decodeURIComponent(sessionCookieMatch[1]);
        const data = JSON.parse(decoded);
        sessionId = data.$sesid?.[1] ?? data.$session_id ?? data.session_id ?? undefined;
      } catch {
        // Silenciar
      }
    }
  }

  return { distinctId, sessionId };
}

/**
 * Normaliza cualquier valor thrown en un Error de JavaScript correcto.
 *
 * Problema raíz: Supabase no lanza instancias de Error sino objetos planos
 * { code, message, details, hint } (PostgrestError). posthog-node no puede
 * extraer el mensaje correctamente de esos objetos y muestra JSON en crudo o null.
 *
 * Esta función garantiza que siempre tengamos un Error con un mensaje legible.
 */
export function normalizeError(err: unknown): Error {
  // Ya es un Error estándar — perfecto
  if (err instanceof Error) {
    return err;
  }

  // Objeto plano con campos conocidos (PostgrestError de Supabase, etc.)
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;

    // Extraer mensaje legible: priorizar 'message', luego construir uno
    let message: string;
    if (typeof obj.message === 'string' && obj.message) {
      message = obj.message;
    } else {
      // Fallback: convertir a JSON legible
      try {
        message = JSON.stringify(obj, null, 0);
      } catch {
        message = '[objeto no serializable]';
      }
    }

    // Crear Error real y copiar propiedades del objeto original
    const error = new Error(message);

    // Detectar PostgrestError de Supabase: { code, message, details, hint }
    // Los objetos de Supabase no extienden Error, son plain objects sin .name
    const isPostgrestError = 'code' in obj && 'details' in obj && 'hint' in obj && typeof obj.message === 'string';

    if (isPostgrestError) {
      error.name = 'PostgrestError';
    } else if (typeof obj.name === 'string' && obj.name) {
      error.name = obj.name;
    } else {
      error.name = 'UnknownError';
    }

    // Adjuntar propiedades originales para contexto adicional
    Object.assign(error, obj);

    return error;
  }

  // String lanzado como error
  if (typeof err === 'string') {
    return new Error(err);
  }

  // Caso extremo
  return new Error(`Error desconocido: ${String(err)}`);
}

/**
 * Serializa un objeto para incluirlo como propiedad de un evento PostHog.
 * Evita [object Object] en las propiedades de los eventos.
 */
export function serializeForPostHog(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
