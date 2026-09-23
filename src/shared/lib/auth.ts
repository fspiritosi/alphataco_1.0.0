import 'server-only';

import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { anonymous } from 'better-auth/plugins/anonymous';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import { APIError } from 'better-auth/api';
import { sendPasswordResetEmail } from '@/shared/lib/mail';
import { resolveDefaultCompanyId } from '@/shared/lib/session-claims';

/**
 * Instancia de Better Auth. Es el reemplazo de Supabase Auth (P4) y el ÚNICO lugar donde se
 * configura la autenticación: el resto del sistema la ve a través de `shared/lib/session.ts`
 * (lectura) y de las actions de `features/Auth` (escritura).
 *
 * ── La invariante del claim de empresa ──────────────────────────────────────────────────
 *
 * `getActiveCompanyId()` (tenant.ts) trata el claim de empresa como DE CONFIANZA y no lo
 * revalida; la cookie `actualComp`, en cambio, es una propuesta que se valida en cada lectura
 * con `canUseAsActiveCompany()`. Todo el perímetro multi-empresa de P2 descansa en eso, así
 * que el claim tiene que seguir siendo imposible de escribir desde el cliente.
 *
 * Cómo se preserva acá, en tres candados independientes:
 *
 * 1. Los claims viven en la SESIÓN (`session.company`, `session.employeeId`), no en el
 *    usuario, y se declaran con `input: false`. Better Auth entonces no los acepta como
 *    entrada en NINGÚN endpoint: ni en el alta (`signUpEmail`), ni en `updateUser`, ni en
 *    `updateSession`, que es el endpoint que el cliente podría llamar para tocar campos
 *    propios de la sesión. Un `POST /api/auth/update-session {"company": "..."}` no escribe
 *    nada. Ver `auth-claims.integration.test.ts`, que lo ejerce contra el handler real.
 * 2. La única escritura posible es la de `shared/lib/session-claims.ts`, que es `server-only`
 *    y va directo a la fila de `auth_session` por Prisma, siempre después de validar la
 *    pertenencia (`canUseAsActiveCompany()` en el cambio de empresa, el legajo del CUIL en el
 *    QR). No hay un endpoint HTTP equivalente.
 * 3. El claim inicial de cada sesión lo pone el servidor en `session.create.before`,
 *    resolviéndolo contra la base (owner / miembro activo / empleado): nunca viene del
 *    formulario de login. Un usuario que no pertenece a ninguna empresa arranca sin claim.
 *
 * Por eso tampoco se usa `session.cookieCache`: con la sesión cacheada en la cookie firmada,
 * una escritura del claim en la base tardaría hasta `maxAge` en verse, y el perímetro leería
 * un claim viejo. `getSession` va siempre a la base (memoizado por request en `session.ts`).
 *
 * ── Ids ────────────────────────────────────────────────────────────────────────────────
 *
 * `generateId` devuelve uuid v4 porque `user.id` es el valor que viaja como
 * `profile.credential_id` y como `app.user_id` de los triggers de auditoría, y `withActor()`
 * exige uuid. Ver `shared/lib/actor.ts`.
 */
const logger = new Logger('shared/auth');

function requiredEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

const googleClientId = requiredEnv('GOOGLE_CLIENT_ID');
const googleClientSecret = requiredEnv('GOOGLE_CLIENT_SECRET');

/** `true` si el login con Google está configurado (lo mira la UI para mostrar el botón). */
export const isGoogleLoginEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  appName: 'alphataco',
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  advanced: {
    database: {
      // uuid: ver el comentario de arriba (actor.ts / profile.credential_id).
      generateId: () => randomUUID(),
    },
  },

  emailAndPassword: {
    enabled: true,
    // No hay registro abierto: al sistema se entra por invitación (tab Empresa → Usuarios).
    // El alta la hace `registerUserWithRole()` escribiendo `auth_user` + `auth_account` dentro
    // de la misma transacción que el `profile`, así que el endpoint público sobra.
    disableSignUp: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
    resetPasswordTokenExpiresIn: 60 * 60 * 24, // 24 h: alcanza para una invitación por mail
  },

  socialProviders: isGoogleLoginEnabled
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          // Misma regla que el login con contraseña: Google NO da de alta. Sólo entra un mail
          // que ya tiene usuario creado por invitación; si no, Better Auth corta el callback.
          disableSignUp: true,
          prompt: 'consent',
          accessType: 'offline',
        },
      }
    : undefined,

  user: {
    modelName: 'user',
    additionalFields: {
      /** Alta con contraseña temporal: el cartel de "cambiá la contraseña". */
      needsPasswordChange: { type: 'boolean', required: false, defaultValue: false, input: false },
      /** Baja de usuario de la empresa. Lo escribe la tab Empresa → Usuarios, nunca el cliente. */
      banned: { type: 'boolean', required: false, defaultValue: false, input: false },
      banReason: { type: 'string', required: false, input: false },
      banExpires: { type: 'date', required: false, input: false },
    },
  },

  session: {
    modelName: 'session',
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    additionalFields: {
      // `input: false` = candado 1 de la invariante. No hay endpoint que los acepte.
      company: { type: 'string', required: false, input: false },
      employeeId: { type: 'string', required: false, input: false },
    },
  },

  account: { modelName: 'account' },
  verification: { modelName: 'verification' },

  databaseHooks: {
    session: {
      create: {
        /**
         * Único punto de alta de sesión del sistema: por acá pasan el login con contraseña, el
         * OAuth de Google y la sesión anónima del QR.
         *
         * Hace dos cosas, y las dos son de seguridad:
         * 1. Corta la sesión de un usuario dado de baja (ban). Es el reemplazo del
         *    `ban_duration` de Supabase Auth, y vale para TODOS los métodos de login.
         * 2. Estampa el claim de empresa resolviéndolo contra la base. El claim nunca sale
         *    del cliente: si el usuario no tiene ninguna empresa utilizable, queda en null y
         *    `getActiveCompanyId()` cae a la cookie (que sí se revalida).
         */
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { banned: true, banExpires: true, isAnonymous: true },
          });

          if (user?.banned && (!user.banExpires || user.banExpires > new Date())) {
            logger.warn('Intento de login de un usuario dado de baja', { data: { userId: session.userId } });
            throw new APIError('FORBIDDEN', {
              message: 'Tu acceso ha sido revocado. Contacta al administrador de tu empresa.',
            });
          }

          // El operario anónimo del QR no tiene empresa hasta que valida su CUIL.
          const company = user?.isAnonymous ? null : await resolveDefaultCompanyId(session.userId);

          return { data: { ...session, company } };
        },
      },
    },
  },

  plugins: [
    anonymous({
      emailDomainName: 'maintenance.alphataco.invalid',
      generateName: () => 'Operario',
      // El operario anónimo del QR SÍ deja rastro en la base: `completeMaintenanceEmployee
      // AnonymousSession()` le crea un `profile`, y las respuestas de checklist y los desvíos
      // apuntan a él. Borrar el usuario al vincular una cuenta dejaría ese profile apuntando a
      // una credencial inexistente, así que no se borra.
      disableDeleteAnonymousUser: true,
    }),
    // Tiene que ser el último: es el que escribe las cookies en las Server Actions.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
