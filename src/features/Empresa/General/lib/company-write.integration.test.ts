import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Integración real contra el Postgres del compose. Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco npx vitest run src/features/Empresa/General/lib/company-write.integration.test.ts
 *
 * Los dos primeros casos ejecutan la server action REAL `createCompany` (se mockea únicamente la
 * sesión: `getSessionUserId` y el `revalidatePath` de Next) y fijan el grant de rol acotado:
 * `user_roles` no tiene `company_id`, así que todo rol otorgado ahí es GLOBAL. Se otorga `admin`
 * SÓLO en el bootstrap (primera empresa del usuario, sin pertenencias ni roles previos); si el
 * usuario ya pertenecía a otra empresa, crear una nueva NO le suma ningún rol.
 *
 * Los otros casos cubren lo que `check-types` no ve de las demás escrituras de Task 6: los
 * `BigInt` de `workshops.city/province`, el `Decimal` nullable de lat/long, la guarda
 * case-insensitive de sectores duplicados y el `contact_phone` bigint.
 *
 * Todo se limpia al final (la server action commitea, así que el borrado es explícito).
 */
const RUN = Boolean(process.env.DATABASE_URL);

const sessionCredentialId = randomUUID();
const sessionProfileId = randomUUID();

/** Usuario que devuelve la sesión mockeada; los casos de carrera lo cambian por uno propio. */
let activeCredentialId = sessionCredentialId;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/shared/lib/session', () => ({
  getSessionUserId: vi.fn(async () => activeCredentialId),
  getSessionUser: vi.fn(async () => ({ id: activeCredentialId, email: 'test@test.com' })),
  getSessionCompanyClaim: vi.fn(async () => null),
  getCachedSession: vi.fn(async () => null),
}));

class Rollback extends Error {}

/** Empresas y perfiles creados por los tests (la server action commitea): se borran en el afterAll. */
const createdCompanyIds: string[] = [];
const createdProfiles: Array<{ profileId: string; credentialId: string }> = [];

/** Crea un profile de prueba y lo deja como usuario de la sesión mockeada. */
async function useFreshSessionUser(): Promise<{ profileId: string; credentialId: string }> {
  const { prisma } = await import('@/shared/lib/prisma');
  const profileId = randomUUID();
  const credentialId = randomUUID();
  await prisma.profile.create({
    data: { id: profileId, credential_id: credentialId, email: `test-${profileId}@test.com`, fullname: 'Test carrera' },
  });
  createdProfiles.push({ profileId, credentialId });
  activeCredentialId = credentialId;
  return { profileId, credentialId };
}

/** FormData del formulario de alta de empresa (los campos que valida `parseCompanyForm`). */
function buildCompanyForm({ cuit, city }: { cuit: string; city: { id: bigint; province_id: bigint } }): FormData {
  const formData = new FormData();
  formData.set('company_name', 'Empresa test Task 6');
  formData.set('company_cuit', cuit);
  formData.set('description', 'prueba de integración');
  formData.set('website', '');
  formData.set('contact_email', 'test@test.com');
  formData.set('contact_phone', '+54 (299) 123-4567');
  formData.set('address', 'Calle 123');
  formData.set('country', 'argentina');
  formData.set('industry', 'Petroleo');
  formData.set('province_id', String(city.province_id));
  formData.set('city', String(city.id));
  return formData;
}

describe.skipIf(!RUN)('escrituras de empresa y talleres (integración)', () => {
  beforeAll(async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    // El compose puede no tener perfiles: se crea el del "usuario de sesión" mockeado.
    await prisma.profile.create({
      data: {
        id: sessionProfileId,
        credential_id: sessionCredentialId,
        email: `test-${sessionProfileId}@test.com`,
        fullname: 'Test Task 6',
      },
    });
  });

  afterAll(async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    }
    const credentialIds = [sessionCredentialId, ...createdProfiles.map((p) => p.credentialId)];
    const profileIds = [sessionProfileId, ...createdProfiles.map((p) => p.profileId)];
    await prisma.user_roles.deleteMany({ where: { user_id: { in: credentialIds } } });
    await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });
  });

  it('createCompany (primera empresa): crea empresa + pertenencia y otorga el rol admin de bootstrap', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { createCompany } = await import('../actions/company.server');

    const city = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
    if (!city) throw new Error('La base del compose necesita al menos una ciudad');

    // Estado de partida del bootstrap: sin pertenencias ni roles.
    expect(await prisma.share_company_users.count({ where: { profile_id: sessionProfileId } })).toBe(0);
    expect(await prisma.user_roles.count({ where: { user_id: sessionCredentialId } })).toBe(0);

    const result = await createCompany(buildCompanyForm({ cuit: '30712345671', city }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdCompanyIds.push(result.data.id);

    const company = await prisma.company.findUnique({
      where: { id: result.data.id },
      select: { owner_id: true, company_cuit: true, contact_phone: true, city: true, province_id: true, by_defect: true },
    });
    const membership = await prisma.share_company_users.findFirst({
      where: { company_id: result.data.id, profile_id: sessionProfileId },
      select: { id: true },
    });
    const roles = await prisma.user_roles.findMany({
      where: { user_id: sessionCredentialId },
      select: { roles: { select: { slug: true } } },
    });

    expect(company).toMatchObject({
      owner_id: sessionProfileId,
      company_cuit: '30712345671',
      // El teléfono se normaliza en `parseCompanyForm` antes de llegar a la base.
      contact_phone: '+542991234567',
      by_defect: false,
    });
    expect(Number(company?.city)).toBe(Number(city.id));
    expect(Number(company?.province_id)).toBe(Number(city.province_id));
    expect(membership).not.toBeNull();
    // Bootstrap: exactamente un rol admin, porque era su primera empresa.
    expect(roles).toEqual([{ roles: { slug: 'admin' } }]);
  });

  it('createCompany (segunda empresa): con pertenencia previa NO suma ningún rol', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { createCompany } = await import('../actions/company.server');

    const city = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
    if (!city) throw new Error('La base del compose necesita al menos una ciudad');

    // Este caso corre después del anterior: el usuario ya tiene una empresa (y su rol de bootstrap).
    const membershipsBefore = await prisma.share_company_users.count({ where: { profile_id: sessionProfileId } });
    const rolesBefore = await prisma.user_roles.count({ where: { user_id: sessionCredentialId } });
    expect(membershipsBefore).toBeGreaterThan(0);

    const result = await createCompany(buildCompanyForm({ cuit: '30712345604', city }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdCompanyIds.push(result.data.id);

    const rolesAfter = await prisma.user_roles.count({ where: { user_id: sessionCredentialId } });
    const membershipsAfter = await prisma.share_company_users.count({ where: { profile_id: sessionProfileId } });

    // La pertenencia sí se crea; el rol NO (ése era el vector de escalación).
    expect(membershipsAfter).toBe(membershipsBefore + 1);
    expect(rolesAfter).toBe(rolesBefore);
  });

  it('createCompany tolera la carrera del rol: con el rol ya creado, la empresa se crea igual y el rol no se duplica', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { createCompany } = await import('../actions/company.server');

    const city = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
    const adminRole = await prisma.roles.findFirst({ where: { slug: 'admin', is_system: true }, select: { id: true } });
    if (!city || !adminRole) throw new Error('La base del compose necesita una ciudad y el rol admin (npm run db:seed)');

    // Usuario nuevo con el rol YA otorgado: simula la carrera ganada por la otra transacción.
    const { profileId, credentialId } = await useFreshSessionUser();
    await prisma.user_roles.create({ data: { user_id: credentialId, role_id: adminRole.id, assigned_by: credentialId } });

    const result = await createCompany(buildCompanyForm({ cuit: '30712345612', city }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdCompanyIds.push(result.data.id);

    const membership = await prisma.share_company_users.findFirst({
      where: { company_id: result.data.id, profile_id: profileId },
      select: { id: true },
    });
    expect(membership).not.toBeNull();
    // El alta no se revierte y el rol sigue siendo uno solo.
    expect(await prisma.user_roles.count({ where: { user_id: credentialId } })).toBe(1);
  });

  it('el grant de bootstrap no aborta la tx si el rol ya existe (createMany skipDuplicates vs create)', async () => {
    const { prisma } = await import('@/shared/lib/prisma');

    const adminRole = await prisma.roles.findFirst({ where: { slug: 'admin', is_system: true }, select: { id: true } });
    if (!adminRole) throw new Error('La base del compose necesita el rol admin (npm run db:seed)');

    // Reproduce el estado exacto de la carrera: la otra transacción ya insertó la fila y la nuestra,
    // que leyó 0 roles, intenta el grant igual. Con `create` esto lanza P2002 y aborta la tx entera
    // (la empresa no se crearía); con `createMany` + `skipDuplicates` no lanza y la tx continúa.
    //
    // Ojo: este caso prueba el MECANISMO, no la action. La ventana de la carrera (contar 0 roles y
    // que otra tx commitee antes del insert) no es alcanzable llamando a `createCompany` desde
    // afuera — dos llamadas en paralelo se serializan y la segunda ya ve el rol en su `count`, así
    // que ningún test end-to-end puede fallar ante esta regresión.
    const { credentialId } = await useFreshSessionUser();
    await prisma.user_roles.create({ data: { user_id: credentialId, role_id: adminRole.id, assigned_by: credentialId } });

    let survivedWithSkipDuplicates = false;
    await prisma
      .$transaction(async (tx) => {
        await tx.user_roles.createMany({
          data: [{ user_id: credentialId, role_id: adminRole.id, assigned_by: credentialId }],
          skipDuplicates: true,
        });
        // La transacción sigue viva después del intento duplicado.
        survivedWithSkipDuplicates = (await tx.user_roles.count({ where: { user_id: credentialId } })) === 1;
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user_roles.create({ data: { user_id: credentialId, role_id: adminRole.id, assigned_by: credentialId } });
      })
    ).rejects.toThrow();

    expect(survivedWithSkipDuplicates).toBe(true);
    expect(await prisma.user_roles.count({ where: { user_id: credentialId } })).toBe(1);
  });

  it('talleres y sectores: bigint de city/province, Decimal nullable y duplicado case-insensitive', async () => {
    const { prisma } = await import('@/shared/lib/prisma');

    const city = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!city || !company) throw new Error('La base del compose necesita al menos una ciudad y una empresa');

    let observed: { workshopCity: number | null; workshopLatitudeNull: boolean; duplicateSectorFound: string | null } | null =
      null;

    await prisma
      .$transaction(async (tx) => {
        const workshop = await tx.workshops.create({
          data: {
            name: 'Taller test',
            type: 'interno',
            company_id: company.id,
            is_active: true,
            city: city.id,
            province: city.province_id,
            latitude: null,
            longitude: null,
          },
          select: { id: true, city: true, latitude: true },
        });

        await tx.workshop_sectors.create({
          data: { name: 'Sector Test', workshop_id: workshop.id, company_id: company.id, is_active: true },
        });
        const duplicate = await tx.workshop_sectors.findFirst({
          where: { workshop_id: workshop.id, name: { equals: 'sector test', mode: 'insensitive' } },
          select: { name: true },
        });

        observed = {
          workshopCity: workshop.city === null ? null : Number(workshop.city),
          workshopLatitudeNull: workshop.latitude === null,
          duplicateSectorFound: duplicate?.name ?? null,
        };
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });

    expect(observed).toEqual({
      workshopCity: Number(city.id),
      workshopLatitudeNull: true,
      duplicateSectorFound: 'Sector Test',
    });
  });

  it('contacts: teléfono bigint y detección de duplicado exacto dentro de la empresa', async () => {
    const { prisma } = await import('@/shared/lib/prisma');

    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!company) throw new Error('La base del compose necesita al menos una empresa');

    let observed: { phone: string | null; duplicateFound: boolean } | null = null;

    await prisma
      .$transaction(async (tx) => {
        const customer = await tx.customers.create({
          data: {
            name: 'Cliente test contactos',
            cuit: BigInt(30_000_000_000 + (Date.now() % 700_000_000)),
            company_id: company.id,
          },
          select: { id: true },
        });
        const created = await tx.contacts.create({
          data: {
            contact_name: 'Juan',
            constact_email: null,
            contact_phone: BigInt('2991234567'),
            contact_charge: 'Jefe',
            customer_id: customer.id,
            company_id: company.id,
          },
          select: { contact_phone: true },
        });
        const duplicate = await tx.contacts.findFirst({
          where: {
            contact_name: 'Juan',
            constact_email: null,
            contact_phone: BigInt('2991234567'),
            contact_charge: 'Jefe',
            customer_id: customer.id,
            company_id: company.id,
          },
          select: { id: true },
        });

        observed = {
          phone: created.contact_phone === null ? null : created.contact_phone.toString(),
          duplicateFound: Boolean(duplicate),
        };
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });

    expect(observed).toEqual({ phone: '2991234567', duplicateFound: true });
  });
});
