import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Integración real contra el Postgres del compose (los 4 RPC de `prisma/sql/permissions.sql`
 * via `callFunction`/`callScalar`, capa `permissions.server.ts`). Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   DIRECT_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   npx vitest run src/features/Permissions/actions/permissions.integration.test.ts
 *
 * La sesión (Supabase Auth, requiere contexto de request de Next.js) se mockea: el usuario con
 * `getSessionUserId` y la empresa activa con `getSessionCompanyClaim` (el claim del JWT, que es
 * lo que `getActiveCompanyId()` prefiere: así no hace falta cookie ni request de Next). Son los
 * únicos puntos de contacto con la sesión, así que mockearlos alcanza para ejercitar el resto de
 * la capa contra la BD real.
 */
const getSessionUserIdMock = vi.fn<() => Promise<string | null>>();
const getSessionCompanyClaimMock = vi.fn<() => Promise<string | null>>();

vi.mock('@/shared/lib/session', () => ({
  getSessionUserId: () => getSessionUserIdMock(),
  getSessionCompanyClaim: () => getSessionCompanyClaimMock(),
}));

// `getActiveCompanyId()` cae a la cookie cuando no hay claim, y `cookies()` necesita el
// contexto de request de Next: acá siempre devuelve "no hay cookie".
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const EQUIPOS_MODULE_ID = '34d7f9e5-7c01-4def-9446-6b3f52d761a0';
// Equipos → Dados de Baja: una tab cualquiera del módulo, sólo para tener un permiso concreto.
const INACTIVE_EQUIPMENT_TAB_ID = '30000000-0000-0000-0000-000000000013';

describe.skipIf(!process.env.DATABASE_URL)('permissions.server (integración)', () => {
  const testUserId = randomUUID();
  let prisma: typeof import('@/shared/lib/prisma').prisma;
  let roleId: bigint;
  let viewActionId: string;
  /** Empresa donde se otorga el rol, y otra donde el mismo usuario no tiene nada. */
  let companyId: string;
  let otherCompanyId: string;

  /** Empresa mínima de prueba (los campos NOT NULL del modelo). */
  async function createTestCompany(cuit: string, cityId: bigint): Promise<string> {
    const company = await prisma.company.create({
      data: {
        company_name: `Test permisos ${cuit}`,
        description: 'integración de permisos',
        contact_email: 'test@test.local',
        contact_phone: '+542991234567',
        address: 'Calle 123',
        city: cityId,
        country: 'argentina',
        industry: 'Petroleo',
        company_cuit: cuit,
      },
      select: { id: true },
    });
    return company.id;
  }

  beforeAll(async () => {
    ({ prisma } = await import('@/shared/lib/prisma'));

    const [tab, viewAction] = await Promise.all([
      prisma.tabs.findUniqueOrThrow({ where: { id: INACTIVE_EQUIPMENT_TAB_ID } }),
      prisma.actions.findFirstOrThrow({ where: { slug: 'view' } }),
    ]);
    expect(tab.module_id).toBe(EQUIPOS_MODULE_ID);
    viewActionId = viewAction.id;

    await prisma.profile.create({
      data: { id: testUserId, credential_id: testUserId, fullname: 'Test P2 Permissions', email: `${testUserId}@test.local` },
    });

    const role = await prisma.roles.create({
      data: { name: `Test role ${testUserId}`, is_system: false, is_active: true },
    });
    roleId = role.id;

    await prisma.role_permissions.create({
      data: { role_id: roleId, tab_id: INACTIVE_EQUIPMENT_TAB_ID, action_id: viewActionId },
    });
    const city = await prisma.cities.findFirstOrThrow({ select: { id: true } });
    companyId = await createTestCompany(`3099${testUserId.slice(0, 7).replace(/\D/g, '').padEnd(7, '1')}`, city.id);
    otherCompanyId = await createTestCompany(`3088${testUserId.slice(0, 7).replace(/\D/g, '').padEnd(7, '2')}`, city.id);

    // El rol se otorga SÓLO en `companyId`: en `otherCompanyId` el mismo usuario no tiene nada.
    await prisma.user_roles.create({
      data: { user_id: testUserId, role_id: roleId, company_id: companyId },
    });
  });

  afterAll(async () => {
    // role_permissions y user_roles caen en cascada al borrar el rol; user_roles también
    // cae en cascada al borrar el profile — se borran ambos por las dudas.
    await prisma.roles.delete({ where: { id: roleId } }).catch(() => undefined);
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherCompanyId] } } }).catch(() => undefined);
    await prisma.profile.delete({ where: { id: testUserId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('getUserPermissionsMapServer: usuario con permiso concedido → mapa con el permiso en true', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    getSessionCompanyClaimMock.mockResolvedValue(companyId);
    const { getUserPermissionsMapServer } = await import('./permissions.server');

    const map = await getUserPermissionsMapServer();

    expect(map['equipos:inactive:view']).toBe(true);
  });

  it('getUserPermissionsMapServer: uuid inexistente → mapa vacío', async () => {
    getSessionUserIdMock.mockResolvedValue(randomUUID());
    getSessionCompanyClaimMock.mockResolvedValue(companyId);
    const { getUserPermissionsMapServer } = await import('./permissions.server');

    const map = await getUserPermissionsMapServer();

    expect(map).toEqual({});
  });

  it('checkPermissionServer / user_has_permission: true para el permiso concedido', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    getSessionCompanyClaimMock.mockResolvedValue(companyId);
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'inactive', 'view')).resolves.toBe(true);
  });

  it('checkPermissionServer / user_has_permission: false para una acción no concedida', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    getSessionCompanyClaimMock.mockResolvedValue(companyId);
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'inactive', 'delete')).resolves.toBe(false);
  });

  it('el rol no sale de su empresa: en otra empresa el mismo usuario no tiene el permiso', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    getSessionCompanyClaimMock.mockResolvedValue(otherCompanyId);
    const { checkPermissionServer, getUserPermissionsMapServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'inactive', 'view')).resolves.toBe(false);
    await expect(getUserPermissionsMapServer()).resolves.toEqual({});
  });

  // ─── Permisos custom (`user_permissions`) ───────────────────────────────────
  // Task 13b: la otra fuente de `get_user_permissions`. Antes era global: un permiso custom
  // otorgado en una empresa valía en todas. Ahora también se acota por `company_id`.

  it('el permiso custom no sale de su empresa: vale en la empresa donde se otorgó y en la otra no', async () => {
    const deleteAction = await prisma.actions.findFirstOrThrow({ where: { slug: 'delete' } });
    await prisma.user_permissions.create({
      data: {
        user_id: testUserId,
        tab_id: INACTIVE_EQUIPMENT_TAB_ID,
        action_id: deleteAction.id,
        company_id: companyId,
        is_granted: true,
      },
    });

    try {
      const { checkPermissionServer } = await import('./permissions.server');

      getSessionUserIdMock.mockResolvedValue(testUserId);
      getSessionCompanyClaimMock.mockResolvedValue(companyId);
      await expect(checkPermissionServer('equipos', 'inactive', 'delete')).resolves.toBe(true);

      getSessionCompanyClaimMock.mockResolvedValue(otherCompanyId);
      await expect(checkPermissionServer('equipos', 'inactive', 'delete')).resolves.toBe(false);
    } finally {
      await prisma.user_permissions.deleteMany({ where: { user_id: testUserId } });
    }
  });

  it('el permiso custom negado (is_granted false) sólo revoca en su empresa', async () => {
    // El rol concede `view` en `companyId`. Un custom `is_granted = false` en la OTRA empresa
    // no tiene que tocar lo que el usuario ve en `companyId`.
    await prisma.user_permissions.create({
      data: {
        user_id: testUserId,
        tab_id: INACTIVE_EQUIPMENT_TAB_ID,
        action_id: viewActionId,
        company_id: otherCompanyId,
        is_granted: false,
      },
    });

    try {
      const { checkPermissionServer } = await import('./permissions.server');

      getSessionUserIdMock.mockResolvedValue(testUserId);
      getSessionCompanyClaimMock.mockResolvedValue(companyId);
      await expect(checkPermissionServer('equipos', 'inactive', 'view')).resolves.toBe(true);
    } finally {
      await prisma.user_permissions.deleteMany({ where: { user_id: testUserId } });
    }
  });

  it('sin empresa activa no hay permisos', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    getSessionCompanyClaimMock.mockResolvedValue(null);
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'inactive', 'view')).resolves.toBe(false);
  });

  it('checkPermissionServer: uuid inexistente → false', async () => {
    getSessionUserIdMock.mockResolvedValue(randomUUID());
    getSessionCompanyClaimMock.mockResolvedValue(companyId);
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'inactive', 'view')).resolves.toBe(false);
  });
});
