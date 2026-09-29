import { ensureCity, ensureDefaultRole } from '@/test/db-fixtures';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * LA INVARIANTE DEL CLAIM, ejercida contra el Postgres del compose y el handler real de
 * Better Auth. Corre sólo con DATABASE_URL:
 *
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   npx vitest run src/shared/lib/auth-claims.integration.test.ts
 *
 * Lo que se afirma es lo que sostiene todo el perímetro multi-empresa de P2 (`tenant.ts`):
 *
 *   El claim de empresa es de confianza porque SÓLO lo escribe el servidor, y siempre después
 *   de validar la pertenencia.
 *
 * Los tests atacan esa propiedad desde afuera, por HTTP, contra `auth.handler`: es el mismo
 * camino que tendría un cliente. Un test unitario con mocks no probaría nada acá — la garantía
 * no está en nuestro código sino en cómo Better Auth trata los campos `input: false`, y eso
 * sólo se verifica ejecutándolo.
 */
const RUN = Boolean(process.env.DATABASE_URL);

const BASE = 'http://localhost:3000/api/auth';
const PASSWORD = 'contrasena-de-prueba-123';

describe.skipIf(!RUN)('claims de sesión: la invariante del perímetro (integración)', () => {
  let prisma: typeof import('@/shared/lib/prisma').prisma;
  let auth: typeof import('@/shared/lib/auth').auth;
  let createCredential: typeof import('@/shared/lib/auth-credentials').createCredential;
  let writeCompanyClaim: typeof import('@/shared/lib/session-claims').writeCompanyClaim;

  const email = `claims-${randomUUID()}@test.local`;
  let userId: string;
  let ownCompanyId: string;
  let foreignCompanyId: string;

  async function createCompany(suffix: string): Promise<string> {
    const city = await ensureCity(prisma);
    const company = await prisma.company.create({
      data: {
        company_name: `Claims ${suffix}`,
        description: 'integración de claims',
        contact_email: 'claims@test.local',
        contact_phone: '+542991234567',
        address: 'Calle 1',
        city: city.id,
        country: 'argentina',
        industry: 'Petroleo',
        company_cuit: `30${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 10)}`,
      },
      select: { id: true },
    });
    return company.id;
  }

  /** Abre una sesión real y devuelve su cookie, como la tendría un navegador. */
  async function signInAndGetCookie(): Promise<string> {
    const response = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers(),
      asResponse: true,
    });
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    return setCookie!
      .split(',')
      .map((part) => part.trim().split(';')[0])
      .filter((part) => part?.includes('='))
      .join('; ');
  }

  async function readSessionRow(cookie: string) {
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    return session;
  }

  beforeAll(async () => {
    ({ prisma } = await import('@/shared/lib/prisma'));
    await ensureDefaultRole(prisma);
    ({ auth } = await import('@/shared/lib/auth'));
    ({ createCredential } = await import('@/shared/lib/auth-credentials'));
    ({ writeCompanyClaim } = await import('@/shared/lib/session-claims'));

    ownCompanyId = await createCompany('propia');
    foreignCompanyId = await createCompany('ajena');

    userId = await prisma.$transaction((tx) =>
      createCredential(tx, { email, name: 'Usuario de claims', password: PASSWORD })
    );

    await prisma.profile.create({
      data: { id: userId, credential_id: userId, email, fullname: 'Usuario de claims' },
    });
    // Miembro activo SÓLO de la empresa propia: la ajena es la que se va a intentar plantar.
    await prisma.share_company_users.create({ data: { company_id: ownCompanyId, profile_id: userId } });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.share_company_users.deleteMany({ where: { profile_id: userId } }).catch(() => undefined);
    await prisma.company.delete({ where: { id: ownCompanyId } }).catch(() => undefined);
    await prisma.company.delete({ where: { id: foreignCompanyId } }).catch(() => undefined);
    await prisma.profile.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('el alta de sesión estampa el claim resolviéndolo contra la base, no contra el login', async () => {
    const cookie = await signInAndGetCookie();
    const session = await readSessionRow(cookie);

    expect(session?.session.company).toBe(ownCompanyId);
    expect(session?.session.employeeId).toBeNull();
  });

  it('el endpoint update-session RECHAZA el claim de empresa (input: false)', async () => {
    const cookie = await signInAndGetCookie();

    const response = await auth.handler(
      new Request(`${BASE}/update-session`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ company: foreignCompanyId }),
      })
    );

    // Better Auth no lo ignora en silencio: lo rechaza con FIELD_NOT_ALLOWED.
    expect(response.status).toBeGreaterThanOrEqual(400);

    const after = await readSessionRow(cookie);
    expect(after?.session.company).toBe(ownCompanyId);
  });

  it('update-session tampoco puede plantar el claim de legajo', async () => {
    const cookie = await signInAndGetCookie();

    const response = await auth.handler(
      new Request(`${BASE}/update-session`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ employeeId: randomUUID() }),
      })
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect((await readSessionRow(cookie))?.session.employeeId).toBeNull();
  });

  it('update-user tampoco escribe los campos server-only del usuario', async () => {
    const cookie = await signInAndGetCookie();

    const response = await auth.handler(
      new Request(`${BASE}/update-user`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ banned: false, needsPasswordChange: false, isAnonymous: true }),
      })
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isAnonymous: true } });
    expect(user.isAnonymous).toBe(false);
  });

  it('el registro público está cerrado: sign-up/email no da de alta', async () => {
    const response = await auth.handler(
      new Request(`${BASE}/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: `abierto-${randomUUID()}@test.local`, password: PASSWORD, name: 'Colado' }),
      })
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('la escritura server-only SÍ mueve el claim', async () => {
    const cookie = await signInAndGetCookie();
    const session = await readSessionRow(cookie);

    await writeCompanyClaim(session!.session.token, foreignCompanyId);

    // Se ve enseguida: no hay cookie cache que devuelva el valor viejo.
    expect((await readSessionRow(cookie))?.session.company).toBe(foreignCompanyId);
  });

  it('escribir el claim sobre una sesión que ya no existe FALLA en vez de mentir', async () => {
    // El modo de falla silencioso: `updateMany` sobre un token inexistente devuelve 0 sin error.
    await expect(writeCompanyClaim('token-que-no-existe', ownCompanyId)).rejects.toThrow();
  });

  it('un usuario baneado no llega a tener sesión (el corte está en session.create.before)', async () => {
    await prisma.user.update({ where: { id: userId }, data: { banned: true } });

    try {
      await expect(
        auth.api.signInEmail({ body: { email, password: PASSWORD }, headers: new Headers() })
      ).rejects.toThrow();
    } finally {
      await prisma.user.update({ where: { id: userId }, data: { banned: false } });
    }
  });

  it('la sesión anónima arranca sin empresa y sin legajo', async () => {
    const response = await auth.handler(new Request(`${BASE}/sign-in/anonymous`, { method: 'POST' }));
    expect(response.status).toBe(200);

    const cookie = (response.headers.get('set-cookie') ?? '')
      .split(',')
      .map((part) => part.trim().split(';')[0])
      .filter((part) => part?.includes('='))
      .join('; ');

    const session = await readSessionRow(cookie);
    expect(session?.user.isAnonymous).toBe(true);
    expect(session?.session.company).toBeNull();
    expect(session?.session.employeeId).toBeNull();

    const anonId = session!.user.id;
    await prisma.user.delete({ where: { id: anonId } }).catch(() => undefined);
  });
});
