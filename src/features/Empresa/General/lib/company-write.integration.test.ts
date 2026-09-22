import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

/**
 * Integración real contra el Postgres del compose (rollback al final). Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco npx vitest run src/features/Empresa/General/lib/company-write.integration.test.ts
 *
 * Cubre lo que `check-types` no ve de las escrituras de Task 6: los `BigInt` de `company.city` /
 * `province_id` y de `workshops.city/province`, el `Decimal` nullable de lat/long, la pertenencia y
 * el rol que `createCompany` crea a mano (el trigger `assign_owner_role_trigger` no los crea porque
 * no existe el rol `owner`), y la guarda case-insensitive de sectores duplicados.
 */
class Rollback extends Error {}

describe.skipIf(!process.env.DATABASE_URL)('escrituras de empresa y talleres (integración)', () => {
  it('crea empresa + pertenencia + rol admin, taller con bigint/Decimal y detecta el sector duplicado', async () => {
    const { prisma } = await import('@/shared/lib/prisma');

    const city = await prisma.cities.findFirst({ select: { id: true, province_id: true } });
    if (!city) throw new Error('La base del compose necesita al menos una ciudad');
    // El compose puede no tener perfiles: se crea uno dentro de la tx (se descarta en el rollback).
    const profileId = randomUUID();
    const credentialId = randomUUID();

    let observed: {
      membershipCreated: boolean;
      adminRoleAssigned: boolean;
      workshopCity: number | null;
      workshopLatitudeNull: boolean;
      duplicateSectorFound: string | null;
    } | null = null;

    await prisma
      .$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.user_id', ${credentialId}, true)`;
        const profile = await tx.profile.create({
          data: { id: profileId, credential_id: credentialId, email: `test-${profileId}@test.com`, fullname: 'Test Task 6' },
          select: { id: true },
        });

        const company = await tx.company.create({
          data: {
            company_name: 'Empresa test Task 6',
            company_cuit: String(30_000_000_000 + (Date.now() % 700_000_000)),
            description: 'prueba de integración',
            website: '',
            contact_email: 'test@test.com',
            contact_phone: '+542991234567',
            address: 'Calle 123',
            country: 'argentina',
            industry: 'Petroleo',
            city: city.id,
            province_id: city.province_id,
            by_defect: false,
            owner_id: profile.id,
            company_logo: '',
          },
          select: { id: true },
        });

        const membership = await tx.share_company_users.findFirst({
          where: { company_id: company.id, profile_id: profile.id },
          select: { id: true },
        });
        if (!membership) {
          await tx.share_company_users.create({ data: { company_id: company.id, profile_id: profile.id } });
        }

        const adminRole = await tx.roles.findFirst({ where: { slug: 'admin' }, select: { id: true } });
        if (!adminRole) throw new Error('La base del compose necesita el rol admin (npm run db:seed)');
        await tx.user_roles.createMany({
          data: [{ user_id: credentialId, role_id: adminRole.id, assigned_by: credentialId }],
          skipDuplicates: true,
        });

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
          membershipCreated: Boolean(
            await tx.share_company_users.findFirst({ where: { company_id: company.id, profile_id: profile.id } })
          ),
          adminRoleAssigned: Boolean(
            await tx.user_roles.findFirst({ where: { user_id: credentialId, role_id: adminRole.id } })
          ),
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
      membershipCreated: true,
      adminRoleAssigned: true,
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
