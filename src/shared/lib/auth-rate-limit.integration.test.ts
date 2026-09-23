import { ensureCity } from '@/test/db-fixtures';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * El freno de fuerza bruta, contra el Postgres del compose. Corre sólo con DATABASE_URL:
 *
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   npx vitest run src/shared/lib/auth-rate-limit.integration.test.ts
 *
 * Lo que hay que probar acá no es la aritmética de la ventana —eso está en
 * `login-rate-limit.test.ts`— sino **que el hook se dispare por el camino que usa el sistema**.
 * El limitador propio de Better Auth vive en el `onRequest` del router y NO cubre
 * `auth.api.signInEmail()`, que es como llaman los cinco logins desde sus Server Actions. Si el
 * freno se pusiera en el lugar equivocado, un test unitario pasaría igual y la app quedaría sin
 * tope. Por eso acá se ejerce `auth.api.*` de verdad.
 */
const RUN = Boolean(process.env.DATABASE_URL);

const PASSWORD = 'Contrasena-de-prueba-1';

describe.skipIf(!RUN)('rate limit de login y recuperación (integración)', () => {
  let prisma: typeof import('@/shared/lib/prisma').prisma;
  let auth: typeof import('@/shared/lib/auth').auth;
  let resetRateLimitStore: typeof import('@/shared/lib/login-rate-limit').resetRateLimitStore;
  let LOGIN_BY_EMAIL: typeof import('@/shared/lib/login-rate-limit').LOGIN_BY_EMAIL;
  let RESET_BY_EMAIL: typeof import('@/shared/lib/login-rate-limit').RESET_BY_EMAIL;

  const email = `ratelimit-${randomUUID()}@test.local`;
  let userId: string;

  /** Cada intento desde una IP distinta: así el tope que se ejerce es el del email. */
  function headersFromRandomIp(): Headers {
    return new Headers({ 'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.0.1` });
  }

  async function attemptLogin(password: string): Promise<{ ok: boolean; message: string }> {
    try {
      await auth.api.signInEmail({ body: { email, password }, headers: headersFromRandomIp() });
      return { ok: true, message: '' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  beforeAll(async () => {
    ({ prisma } = await import('@/shared/lib/prisma'));
    ({ auth } = await import('@/shared/lib/auth'));
    ({ resetRateLimitStore, LOGIN_BY_EMAIL, RESET_BY_EMAIL } = await import('@/shared/lib/login-rate-limit'));

    await ensureCity(prisma);
    const { createCredential } = await import('@/shared/lib/auth-credentials');
    userId = await prisma.$transaction((tx) =>
      createCredential(tx, { email, name: 'Rate limit', password: PASSWORD })
    );
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  beforeEach(() => resetRateLimitStore());

  it('el hook SÍ corre por `auth.api.signInEmail` (no sólo por /api/auth)', async () => {
    for (let i = 0; i < LOGIN_BY_EMAIL.max; i++) {
      const result = await attemptLogin('Contrasena-incorrecta-9');
      expect(result.ok).toBe(false);
      expect(result.message).not.toMatch(/demasiados intentos/i);
    }

    const blocked = await attemptLogin('Contrasena-incorrecta-9');
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/demasiados intentos/i);
  });

  it('bloqueado el email, ni siquiera la contraseña correcta entra', async () => {
    for (let i = 0; i <= LOGIN_BY_EMAIL.max; i++) await attemptLogin('Contrasena-incorrecta-9');

    const conLaBuena = await attemptLogin(PASSWORD);
    expect(conLaBuena.ok).toBe(false);
    expect(conLaBuena.message).toMatch(/demasiados intentos/i);
  });

  it('sólo cuentan los intentos fallidos: un login exitoso limpia el contador', async () => {
    for (let i = 0; i < LOGIN_BY_EMAIL.max - 1; i++) await attemptLogin('Contrasena-incorrecta-9');

    expect((await attemptLogin(PASSWORD)).ok).toBe(true);

    // Con el contador limpio vuelve a tener el presupuesto entero.
    for (let i = 0; i < LOGIN_BY_EMAIL.max; i++) {
      expect((await attemptLogin('Contrasena-incorrecta-9')).message).not.toMatch(/demasiados intentos/i);
    }
  });

  it('el tope también cubre la recuperación de contraseña', async () => {
    for (let i = 0; i < RESET_BY_EMAIL.max; i++) {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: '/reset_password/update-user' },
        headers: headersFromRandomIp(),
      });
    }

    await expect(
      auth.api.requestPasswordReset({
        body: { email, redirectTo: '/reset_password/update-user' },
        headers: headersFromRandomIp(),
      })
    ).rejects.toThrow(/demasiados intentos/i);
  });

  /**
   * La rama que el spec de Cypress no ejercita: ahí sólo se pide el enlace para un mail que NO
   * existe, que corta en el early-return uniforme. Con un mail real se emite el token, se arma
   * la URL y se dispara el mail — nada de eso estaba cubierto.
   */
  it('con un mail que existe emite el token y el enlace que consume resetPassword', async () => {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: '/reset_password/update-user' },
      headers: headersFromRandomIp(),
    });

    const verification = await prisma.verification.findFirst({
      where: { value: userId, identifier: { startsWith: 'reset-password:' } },
      orderBy: { createdAt: 'desc' },
    });
    expect(verification).not.toBeNull();
    expect(verification!.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const token = verification!.identifier.replace('reset-password:', '');
    const nueva = 'La-nueva-del-mail-1';
    await auth.api.resetPassword({ body: { newPassword: nueva, token }, headers: new Headers() });

    resetRateLimitStore();
    const result = await auth.api.signInEmail({ body: { email, password: nueva }, headers: headersFromRandomIp() });
    expect(result.user.id).toBe(userId);
  });

  /**
   * `revokeSessionsOnPasswordReset: true`: quien recupera su contraseña porque le robaron la
   * cuenta tiene que dejar afuera al atacante.
   */
  it('el reset por mail cierra las sesiones abiertas', async () => {
    resetRateLimitStore();
    await auth.api.signInEmail({ body: { email, password: 'La-nueva-del-mail-1' }, headers: headersFromRandomIp() });
    expect(await prisma.session.count({ where: { userId } })).toBeGreaterThan(0);

    await auth.api.requestPasswordReset({
      body: { email, redirectTo: '/reset_password/update-user' },
      headers: headersFromRandomIp(),
    });
    const verification = await prisma.verification.findFirstOrThrow({
      where: { value: userId, identifier: { startsWith: 'reset-password:' } },
      orderBy: { createdAt: 'desc' },
    });

    await auth.api.resetPassword({
      body: { newPassword: 'Otra-mas-todavia-1', token: verification.identifier.replace('reset-password:', '') },
      headers: new Headers(),
    });

    expect(await prisma.session.count({ where: { userId } })).toBe(0);
  });
});
