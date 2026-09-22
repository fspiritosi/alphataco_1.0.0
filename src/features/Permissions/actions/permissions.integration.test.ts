import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Integración real contra el Postgres del compose (los 4 RPC de `prisma/sql/permissions.sql`
 * via `callFunction`/`callScalar`, capa `permissions.server.ts`). Corre sólo con DATABASE_URL:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   DIRECT_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco \
 *   npx vitest run src/features/Permissions/actions/permissions.integration.test.ts
 *
 * `getSessionUserId` (Supabase Auth, requiere contexto de request de Next.js) se mockea para
 * devolver el `credential_id` del profile de prueba: es el único punto de contacto con la
 * sesión, así que mockearlo alcanza para ejercitar el resto de la capa contra la BD real.
 */
const getSessionUserIdMock = vi.fn<() => Promise<string | null>>();

vi.mock('@/shared/lib/session', () => ({
  getSessionUserId: () => getSessionUserIdMock(),
}));

const EQUIPOS_MODULE_ID = '34d7f9e5-7c01-4def-9446-6b3f52d761a0';
const EQUIPMENTS_WITH_DEVIATIONS_TAB_ID = '60000000-0000-0000-0000-000000000019';

describe.skipIf(!process.env.DATABASE_URL)('permissions.server (integración)', () => {
  const testUserId = randomUUID();
  let prisma: typeof import('@/shared/lib/prisma').prisma;
  let roleId: bigint;
  let viewActionId: string;

  beforeAll(async () => {
    ({ prisma } = await import('@/shared/lib/prisma'));

    const [tab, viewAction] = await Promise.all([
      prisma.tabs.findUniqueOrThrow({ where: { id: EQUIPMENTS_WITH_DEVIATIONS_TAB_ID } }),
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
      data: { role_id: roleId, tab_id: EQUIPMENTS_WITH_DEVIATIONS_TAB_ID, action_id: viewActionId },
    });
    await prisma.user_roles.create({
      data: { user_id: testUserId, role_id: roleId },
    });
  });

  afterAll(async () => {
    // role_permissions y user_roles caen en cascada al borrar el rol; user_roles también
    // cae en cascada al borrar el profile — se borran ambos por las dudas.
    await prisma.roles.delete({ where: { id: roleId } }).catch(() => undefined);
    await prisma.profile.delete({ where: { id: testUserId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('getUserPermissionsMapServer: usuario con permiso concedido → mapa con el permiso en true', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    const { getUserPermissionsMapServer } = await import('./permissions.server');

    const map = await getUserPermissionsMapServer();

    expect(map['equipos:equipments_with_deviations:view']).toBe(true);
  });

  it('getUserPermissionsMapServer: uuid inexistente → mapa vacío', async () => {
    getSessionUserIdMock.mockResolvedValue(randomUUID());
    const { getUserPermissionsMapServer } = await import('./permissions.server');

    const map = await getUserPermissionsMapServer();

    expect(map).toEqual({});
  });

  it('checkPermissionServer / user_has_permission: true para el permiso concedido', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'equipments_with_deviations', 'view')).resolves.toBe(true);
  });

  it('checkPermissionServer / user_has_permission: false para una acción no concedida', async () => {
    getSessionUserIdMock.mockResolvedValue(testUserId);
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'equipments_with_deviations', 'delete')).resolves.toBe(false);
  });

  it('checkPermissionServer: uuid inexistente → false', async () => {
    getSessionUserIdMock.mockResolvedValue(randomUUID());
    const { checkPermissionServer } = await import('./permissions.server');

    await expect(checkPermissionServer('equipos', 'equipments_with_deviations', 'view')).resolves.toBe(false);
  });
});
