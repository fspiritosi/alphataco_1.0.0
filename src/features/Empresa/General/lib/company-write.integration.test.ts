import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Integración real contra el Postgres del compose. Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco npx vitest run src/features/Empresa/General/lib/company-write.integration.test.ts
 *
 * El primer caso ejecuta la server action REAL `createCompany` (se mockea únicamente la sesión:
 * `getSessionUserId` y el `revalidatePath` de Next). Verifica el `owner_id`, la pertenencia y —
 * sobre todo — que NO se cree ninguna fila en `user_roles`: `user_roles` no tiene `company_id`,
 * así que un rol asignado acá valdría en TODAS las empresas del usuario.
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

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/shared/lib/session', () => ({
  getSessionUserId: vi.fn(async () => sessionCredentialId),
  getSessionUser: vi.fn(async () => ({ id: sessionCredentialId, email: 'test@test.com' })),
  getSessionCompanyClaim: vi.fn(async () => null),
  getCachedSession: vi.fn(async () => null),
}));

class Rollback extends Error {}

/** Empresas creadas por el test (la server action commitea): se borran en el afterAll. */
const createdCompanyIds: string[] = [];

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
    await prisma.user_roles.deleteMany({ where: { user_id: sessionCredentialId } });
    await prisma.profile.deleteMany({ where: { id: sessionProfileId } });
  });

  it('createCompany: crea la empresa con owner de sesión y su pertenencia, y NO asigna ningún rol', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { createCompany } = await import('../actions/company.server');

    const city = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
    if (!city) throw new Error('La base del compose necesita al menos una ciudad');

    const rolesBefore = await prisma.user_roles.count({ where: { user_id: sessionCredentialId } });

    const formData = new FormData();
    formData.set('company_name', 'Empresa test Task 6');
    formData.set('company_cuit', '30712345671');
    formData.set('description', 'prueba de integración');
    formData.set('website', '');
    formData.set('contact_email', 'test@test.com');
    formData.set('contact_phone', '+54 (299) 123-4567');
    formData.set('address', 'Calle 123');
    formData.set('country', 'argentina');
    formData.set('industry', 'Petroleo');
    formData.set('province_id', String(city.province_id));
    formData.set('city', String(city.id));

    const result = await createCompany(formData);
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
    const rolesAfter = await prisma.user_roles.count({ where: { user_id: sessionCredentialId } });

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
    // Critical: `user_roles` no tiene `company_id` — un rol asignado acá sería global.
    expect(rolesAfter).toBe(rolesBefore);
    expect(rolesAfter).toBe(0);
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
