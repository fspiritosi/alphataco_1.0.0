import { ensureCity, ensureDefaultRole } from '@/test/db-fixtures';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integración real contra el Postgres del compose. Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   npx vitest run src/features/Auth/actions/register-user.integration.test.ts
 *
 * Cubre el MECANISMO del que depende `assignRoleInCompany` (register-user.ts): el grant del
 * rol usa `createMany` + `skipDuplicates` y NO `create`, porque en el alta de usuario la
 * carrera SÍ es alcanzable —a diferencia de `createCompany`, donde el rol se inserta contra
 * una empresa recién creada dentro de la misma transacción y la unique no puede chocar—.
 *
 * El escenario: `addExistingProfileToCompany` chequea la pertenencia con un `findFirst`
 * (lectura, no constraint), así que dos invitaciones simultáneas del mismo usuario al mismo
 * rol de la misma empresa pasan ambas el chequeo y la segunda choca con la unique
 * `(user_id, role_id, company_id)`. Con `create` ese P2002 aborta la transacción entera y el
 * alta se pierde; con `createMany` + `skipDuplicates` no lanza y la transacción sigue.
 *
 * Es un test del mecanismo y no de la action: `registerUserWithRole` pasa por Supabase Auth
 * (createUser / updateUserById), que no corre contra el compose.
 */
const RUN = Boolean(process.env.DATABASE_URL);

class Rollback extends Error {}

describe.skipIf(!RUN)('assignRoleInCompany: grant del rol en el alta de usuario (integración)', () => {
  const credentialId = randomUUID();
  let prisma: typeof import('@/shared/lib/prisma').prisma;
  let roleId: bigint;
  let companyId: string;

  beforeAll(async () => {
    ({ prisma } = await import('@/shared/lib/prisma'));
    await ensureDefaultRole(prisma);

    await prisma.profile.create({
      data: {
        id: credentialId,
        credential_id: credentialId,
        email: `${credentialId}@test.local`,
        fullname: 'Test alta de usuario',
      },
    });

    const role = await prisma.roles.create({
      data: { name: `Test role alta ${credentialId}`, is_system: false, is_active: true },
    });
    roleId = role.id;

    const city = await ensureCity(prisma);
    const company = await prisma.company.create({
      data: {
        company_name: `Test alta ${credentialId.slice(0, 8)}`,
        description: 'integración del alta de usuario',
        contact_email: 'test@test.local',
        contact_phone: '+542991234567',
        address: 'Calle 123',
        city: city.id,
        country: 'argentina',
        industry: 'Petroleo',
        company_cuit: `3077${credentialId.replace(/\D/g, '').slice(0, 7).padEnd(7, '3')}`,
      },
      select: { id: true },
    });
    companyId = company.id;

    // La otra invitación ya commiteó su fila: es el estado exacto de la carrera.
    await prisma.user_roles.create({ data: { user_id: credentialId, role_id: roleId, company_id: companyId } });
  });

  afterAll(async () => {
    await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
    await prisma.roles.delete({ where: { id: roleId } }).catch(() => undefined);
    await prisma.profile.delete({ where: { id: credentialId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('createMany + skipDuplicates no aborta la transacción con el rol ya otorgado', async () => {
    let survived = false;

    await prisma
      .$transaction(async (tx) => {
        await tx.user_roles.createMany({
          data: [{ user_id: credentialId, role_id: roleId, company_id: companyId, assigned_by: credentialId }],
          skipDuplicates: true,
        });
        // La transacción sigue viva después del intento duplicado y el rol no se duplicó.
        survived = (await tx.user_roles.count({ where: { user_id: credentialId, company_id: companyId } })) === 1;
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });

    expect(survived).toBe(true);
  });

  it('con `create` la misma situación lanza P2002 (por eso el grant no puede usarlo)', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user_roles.create({
          data: { user_id: credentialId, role_id: roleId, company_id: companyId, assigned_by: credentialId },
        });
      })
    ).rejects.toThrow();

    expect(await prisma.user_roles.count({ where: { user_id: credentialId, company_id: companyId } })).toBe(1);
  });

  it('la unique es por empresa: el mismo rol en OTRA empresa no choca', async () => {
    const city = await ensureCity(prisma);
    const other = await prisma.company.create({
      data: {
        company_name: `Test alta otra ${credentialId.slice(0, 8)}`,
        description: 'integración del alta de usuario',
        contact_email: 'test2@test.local',
        contact_phone: '+542991234567',
        address: 'Calle 456',
        city: city.id,
        country: 'argentina',
        industry: 'Petroleo',
        company_cuit: `3066${credentialId.replace(/\D/g, '').slice(0, 7).padEnd(7, '4')}`,
      },
      select: { id: true },
    });

    try {
      await prisma.user_roles.create({
        data: { user_id: credentialId, role_id: roleId, company_id: other.id, assigned_by: credentialId },
      });
      expect(await prisma.user_roles.count({ where: { user_id: credentialId } })).toBe(2);
    } finally {
      await prisma.company.delete({ where: { id: other.id } }).catch(() => undefined);
    }
  });
});
