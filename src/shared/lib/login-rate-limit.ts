import 'server-only';

/**
 * Freno de fuerza bruta para los logins y la recuperación de contraseña.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────────────────
 *
 * El limitador propio de Better Auth vive en el `onRequest` del router, o sea que sólo cubre
 * `/api/auth/*`. Los cinco logins del sistema llaman `auth.api.signInEmail()` **directo desde
 * Server Actions**, que no pasan por el router: quedarían sin ningún tope. GoTrue (Supabase
 * Auth) traía esos límites del lado del servidor y el sistema dependía de ellos sin saberlo, así
 * que al migrar se perdieron en silencio.
 *
 * Por eso el freno no se aplica en cada action sino en un hook `before` de la config de auth
 * (`shared/lib/auth.ts`): los hooks corren en el pipeline del endpoint, que es el mismo para el
 * router y para `auth.api.*` (ver `api/dispatch.mjs`). Una sola implementación cubre los cinco
 * logins, la recuperación de contraseña y también los endpoints HTTP.
 *
 * ── El almacén es EN MEMORIA, a propósito ───────────────────────────────────────────────
 *
 * Es un `Map` del proceso. Trade-off explícito:
 *
 * - Frena el ataque real (fuerza bruta online contra un despliegue de un solo contenedor en
 *   VPS, que es como corre este sistema) sin agregar tabla, migración ni job de limpieza.
 * - Se reinicia con cada deploy o restart del contenedor, y no se comparte entre instancias.
 *   Si alguna vez la app corre replicada, esto hay que moverlo a la base (el contrato de
 *   `consumeAttempt` / `clearAttempts` no cambia).
 *
 * Se cuentan sólo los intentos FALLIDOS: el hook `after` limpia el contador del email cuando el
 * login sale bien. Si ese hook no llegara a correr, el contador queda consumido — el lado
 * seguro.
 */

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitRule {
  /** Intentos permitidos dentro de la ventana. */
  max: number;
  /** Largo de la ventana, en segundos. */
  windowSeconds: number;
}

/** Login: por email y por IP. El tope por IP es más alto porque una oficina sale por una sola. */
export const LOGIN_BY_EMAIL: RateLimitRule = { max: 8, windowSeconds: 15 * 60 };
export const LOGIN_BY_IP: RateLimitRule = { max: 40, windowSeconds: 15 * 60 };

/** Recuperación de contraseña: acá el costo del abuso es mandar mails, no adivinar. */
export const RESET_BY_EMAIL: RateLimitRule = { max: 5, windowSeconds: 60 * 60 };
export const RESET_BY_IP: RateLimitRule = { max: 20, windowSeconds: 60 * 60 };

const windows = new Map<string, Window>();

/** Cota dura del Map: un atacante que rota el email no puede hacerlo crecer sin límite. */
const MAX_TRACKED_KEYS = 20_000;

function prune(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos que faltan para que se libere, 0 si está permitido. */
  retryAfterSeconds: number;
}

/**
 * Registra un intento contra `key` y dice si está permitido.
 *
 * Cuando se pasa del tope NO extiende la ventana (no es un backoff): pasada la ventana, el
 * contador arranca de cero. Alcanza para volver inviable el barrido de contraseñas sin dejar a
 * un usuario legítimo afuera más de `windowSeconds`.
 */
export function consumeAttempt(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  if (windows.size > MAX_TRACKED_KEYS) prune(now);

  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > rule.max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Borra el contador de una clave (login exitoso). */
export function clearAttempts(key: string): void {
  windows.delete(key);
}

/** Sólo para los tests: deja el almacén vacío. */
export function resetRateLimitStore(): void {
  windows.clear();
}
