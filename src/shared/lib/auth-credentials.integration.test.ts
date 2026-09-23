import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integración real contra el Postgres del compose. Corre sólo con DATABASE_URL:
 *
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   npx vitest run src/shared/lib/auth-credentials.integration.test.ts
 *
 * Cubre el ACOPLAMIENTO que hace posible el alta transaccional de usuario: `createCredential()`
 * escribe `auth_user` + `auth_account` con el `tx` de Prisma y hashea con `hashPassword` de
 * `better-auth/crypto`, en vez de pasar por `auth.api.signUpEmail()` (que usa su propio
 * cliente y no entraría en la transacción).
 *
 * Eso vale mientras el hash que escribimos sea el que la librería verifica al loguear. Nada
 * en el tipado lo garantiza: un cambio de hasher por defecto en Better Auth rompería el login
 * de todos los usuarios creados por invitación, en silencio. Este test es el que lo detecta —
 * crea la credencial por nuestro camino y la loguea por el de la librería.
 *
 * Verifica además el alta transaccional en sí: si la transacción aborta, no queda ni el
 * usuario ni la cuenta (la "credencial huérfana" de Supabase Auth desaparece por construcción).
 */
const RUN = Boolean(process.env.DATABASE_URL);

const PASSWORD = 'contrasena-inicial-123';

class Rollback extends Error {}

describe.skipIf(!RUN)('createCredential + setCredentialPassword (integración)', () => {
  let prisma: typeof import('@/shared/lib/prisma').prisma;
  let auth: typeof import('@/shared/lib/auth').auth;
  let credentials: typeof import('@/shared/lib/auth-credentials');

  const email = `cred-${randomUUID()}@test.local`;
  let userId: string;

  beforeAll(async () => {
    ({ prisma } = await import('@/shared/lib/prisma'));
    ({ auth } = await import('@/shared/lib/auth'));
    credentials = await import('@/shared/lib/auth-credentials');

    userId = await prisma.$transaction((tx) =>
      credentials.createCredential(tx, { email, name: 'Credencial de prueba', password: PASSWORD })
    );
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('la contraseña que escribimos la verifica el login de Better Auth', async () => {
    const result = await auth.api.signInEmail({ body: { email, password: PASSWORD }, headers: new Headers() });
    expect(result.user.id).toBe(userId);
  });

  it('el id del usuario es un uuid (lo exige withActor y profile.credential_id)', () => {
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('el mail se guarda normalizado: el login con otra capitalización entra igual', async () => {
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    expect(stored.email).toBe(email.toLowerCase());

    const result = await auth.api.signInEmail({
      body: { email: email.toUpperCase(), password: PASSWORD },
      headers: new Headers(),
    });
    expect(result.user.id).toBe(userId);
  });

  it('si la transacción del alta aborta no queda ni el usuario ni la cuenta', async () => {
    const orphanEmail = `orfano-${randomUUID()}@test.local`;
    let attemptedId = '';

    await prisma
      .$transaction(async (tx) => {
        attemptedId = await credentials.createCredential(tx, {
          email: orphanEmail,
          name: 'Nunca existió',
          password: PASSWORD,
        });
        // Esto es lo que antes fallaba DESPUÉS de haber creado la credencial en otro sistema.
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });

    expect(attemptedId).not.toBe('');
    expect(await prisma.user.findUnique({ where: { id: attemptedId } })).toBeNull();
    expect(await prisma.account.findFirst({ where: { userId: attemptedId } })).toBeNull();
  });

  it('el enlace de invitación es un token que consume el resetPassword nativo', async () => {
    const invitedEmail = `invitado-${randomUUID()}@test.local`;
    const nuevaPassword = 'la-que-elige-el-invitado-1';

    const { invitedId, url } = await prisma.$transaction(async (tx) => {
      // Invitación = alta SIN contraseña: el usuario la define con el enlace del mail.
      const id = await credentials.createCredential(tx, { email: invitedEmail, name: 'Invitado' });
      return { invitedId: id, url: await credentials.createPasswordSetupLink(tx, id) };
    });

    try {
      // Sin contraseña todavía no puede entrar.
      await expect(
        auth.api.signInEmail({ body: { email: invitedEmail, password: nuevaPassword }, headers: new Headers() })
      ).rejects.toThrow();

      const token = new URL(url).pathname.split('/').pop()!;
      await auth.api.resetPassword({ body: { newPassword: nuevaPassword, token }, headers: new Headers() });

      const result = await auth.api.signInEmail({
        body: { email: invitedEmail, password: nuevaPassword },
        headers: new Headers(),
      });
      expect(result.user.id).toBe(invitedId);

      // El token es de un solo uso.
      await expect(
        auth.api.resetPassword({ body: { newPassword: 'otra-mas-todavia-1', token }, headers: new Headers() })
      ).rejects.toThrow();
    } finally {
      await prisma.session.deleteMany({ where: { userId: invitedId } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: invitedId } }).catch(() => undefined);
    }
  });

  it('setCredentialPassword cambia la contraseña y cierra las otras sesiones', async () => {
    const otraPassword = 'contrasena-cambiada-456';

    const sobreviviente = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers(),
      returnHeaders: true,
    });
    const tokens = await prisma.session.findMany({ where: { userId }, select: { token: true } });
    expect(tokens.length).toBeGreaterThan(1);
    const keep = tokens[0]!.token;
    expect(sobreviviente.response.user.id).toBe(userId);

    await credentials.setCredentialPassword(userId, otraPassword, keep);

    const remaining = await prisma.session.findMany({ where: { userId }, select: { token: true } });
    expect(remaining.map((s) => s.token)).toEqual([keep]);

    await expect(
      auth.api.signInEmail({ body: { email, password: PASSWORD }, headers: new Headers() })
    ).rejects.toThrow();

    const result = await auth.api.signInEmail({ body: { email, password: otraPassword }, headers: new Headers() });
    expect(result.user.id).toBe(userId);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { needsPasswordChange: true } });
    expect(user.needsPasswordChange).toBe(false);
  });
});
