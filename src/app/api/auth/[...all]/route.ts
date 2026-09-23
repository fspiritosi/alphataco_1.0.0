import { auth } from '@/shared/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Endpoints de Better Auth (`/api/auth/*`): login, logout, OAuth, recuperación de contraseña
 * y la sesión anónima del QR.
 *
 * Los claims de empresa y legajo NO se pueden tocar por acá: están declarados `input: false`
 * en `shared/lib/auth.ts`, así que ningún endpoint —`update-session` incluido— los acepta.
 * La única escritura vive en `shared/lib/session-claims.ts`, que es `server-only`.
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
