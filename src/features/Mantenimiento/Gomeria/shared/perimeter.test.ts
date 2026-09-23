import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Guardas de autorización multi-empresa de Gomería.
 *
 * Gomería tiene DOS perímetros y romper la diferencia entre ellos es silencioso:
 *
 * - **Por recurso** (`...InCompany`, `getServiceOrderCompanyId`): la empresa sale de la orden
 *   o del vehículo y NO se toca la sesión. Es lo que hace funcionar el QR anónimo, donde el
 *   operario tiene sesión pero no es miembro de la empresa del equipo. Si alguien "unificara"
 *   estas guardas contra la empresa activa, el QR dejaría de andar.
 * - **De sesión** (`...InActiveCompany`): la empresa la pone `getActiveCompanyId()`.
 *
 * Los tests cubren, para cada una: el caso legítimo, el caso cruzado entre empresas y —en las
 * del perímetro por recurso— que la sesión no se consulte nunca.
 */
const prismaMock = vi.hoisted(() => ({
  tire_service_orders: { findUnique: vi.fn(), findFirst: vi.fn() },
  vehicles: { findUnique: vi.fn(), findFirst: vi.fn() },
  other_equipment: { findUnique: vi.fn() },
  tires: { findFirst: vi.fn() },
  tire_brands: { findFirst: vi.fn() },
  tire_types: { findFirst: vi.fn() },
  tire_templates: { findFirst: vi.fn() },
  sub_type: { findFirst: vi.fn() },
}));
vi.mock('@/shared/lib/prisma', () => ({ prisma: prismaMock }));

const getActiveCompanyIdMock = vi.hoisted(() => vi.fn<() => Promise<string>>());
vi.mock('@/shared/lib/tenant', () => ({ getActiveCompanyId: getActiveCompanyIdMock }));

import {
  assertServiceOrderInActiveCompany,
  assertSubTypeInActiveCompany,
  assertTemplateInActiveCompany,
  assertTireBrandInActiveCompany,
  assertTireCatalogRefsInCompany,
  assertTireInActiveCompany,
  assertTireInCompany,
  assertTireTypeInActiveCompany,
  assertVehicleInActiveCompany,
  assertVehicleInCompany,
  getServiceOrderCompanyId,
  getVehicleCompanyId,
} from './perimeter';

const COMPANY_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const COMPANY_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const ORDER_ID = 'cccccccc-0000-4000-8000-000000000003';
const VEHICLE_ID = 'dddddddd-0000-4000-8000-000000000004';
const TIRE_ID = 'eeeeeeee-0000-4000-8000-000000000005';
const BRAND_ID = 'ffffffff-0000-4000-8000-000000000006';
const TIRE_TYPE_ID = '11111111-0000-4000-8000-000000000007';

/** El cliente que reciben las guardas "por recurso" (puede ser un `tx`, no el prisma global). */
const client = prismaMock as unknown as Parameters<typeof assertVehicleInCompany>[0];

beforeEach(() => {
  vi.clearAllMocks();
  getActiveCompanyIdMock.mockResolvedValue(COMPANY_A);
});

// ─── Perímetro por recurso (QR + dashboard) ──────────────────────────────────

describe('getServiceOrderCompanyId', () => {
  it('devuelve la empresa de la orden sin mirar la sesión (flujo QR)', async () => {
    prismaMock.tire_service_orders.findUnique.mockResolvedValue({ company_id: COMPANY_B });

    await expect(getServiceOrderCompanyId(client, ORDER_ID)).resolves.toBe(COMPANY_B);
    expect(getActiveCompanyIdMock).not.toHaveBeenCalled();
  });

  it('lanza si la orden no existe', async () => {
    prismaMock.tire_service_orders.findUnique.mockResolvedValue(null);

    await expect(getServiceOrderCompanyId(client, ORDER_ID)).rejects.toThrow('No se encontró la orden de gomería');
  });
});

describe('getVehicleCompanyId', () => {
  it('devuelve la empresa del vehículo sin mirar la sesión (flujo QR)', async () => {
    prismaMock.vehicles.findUnique.mockResolvedValue({ company_id: COMPANY_B });

    await expect(getVehicleCompanyId(client, VEHICLE_ID)).resolves.toBe(COMPANY_B);
    expect(getActiveCompanyIdMock).not.toHaveBeenCalled();
  });

  it('lanza si el vehículo no existe', async () => {
    prismaMock.vehicles.findUnique.mockResolvedValue(null);

    await expect(getVehicleCompanyId(client, VEHICLE_ID)).rejects.toThrow('No se encontró la empresa del vehículo');
  });
});

describe('assertVehicleInCompany', () => {
  it('pasa si el vehículo es de la empresa pedida y filtra por ambas claves', async () => {
    prismaMock.vehicles.findFirst.mockResolvedValue({ id: VEHICLE_ID });

    await expect(assertVehicleInCompany(client, VEHICLE_ID, COMPANY_B)).resolves.toBeUndefined();
    expect(prismaMock.vehicles.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VEHICLE_ID, company_id: COMPANY_B } })
    );
    expect(getActiveCompanyIdMock).not.toHaveBeenCalled();
  });

  it('lanza si el vehículo es de OTRA empresa', async () => {
    prismaMock.vehicles.findFirst.mockResolvedValue(null);

    await expect(assertVehicleInCompany(client, VEHICLE_ID, COMPANY_B)).rejects.toThrow(
      'El equipo no pertenece a la empresa de la orden'
    );
  });
});

describe('assertTireInCompany', () => {
  it('pasa si la cubierta es de la empresa pedida', async () => {
    prismaMock.tires.findFirst.mockResolvedValue({ id: TIRE_ID });

    await expect(assertTireInCompany(client, TIRE_ID, COMPANY_B)).resolves.toBeUndefined();
    expect(prismaMock.tires.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TIRE_ID, company_id: COMPANY_B } })
    );
  });

  it('lanza si la cubierta es de OTRA empresa', async () => {
    prismaMock.tires.findFirst.mockResolvedValue(null);

    await expect(assertTireInCompany(client, TIRE_ID, COMPANY_B)).rejects.toThrow(
      'La cubierta no pertenece a la empresa de la orden'
    );
  });
});

describe('assertTireCatalogRefsInCompany', () => {
  const refs = { brandId: BRAND_ID, tireTypeId: TIRE_TYPE_ID };

  it('pasa si marca y tipo son de la empresa', async () => {
    prismaMock.tire_brands.findFirst.mockResolvedValue({ id: BRAND_ID });
    prismaMock.tire_types.findFirst.mockResolvedValue({ id: TIRE_TYPE_ID });

    await expect(assertTireCatalogRefsInCompany(client, refs, COMPANY_A)).resolves.toBeUndefined();
  });

  it('lanza si la marca es de otra empresa', async () => {
    prismaMock.tire_brands.findFirst.mockResolvedValue(null);
    prismaMock.tire_types.findFirst.mockResolvedValue({ id: TIRE_TYPE_ID });

    await expect(assertTireCatalogRefsInCompany(client, refs, COMPANY_A)).rejects.toThrow(
      'La marca de cubierta no pertenece a la empresa'
    );
  });

  it('lanza si el tipo es de otra empresa aunque la marca esté bien', async () => {
    prismaMock.tire_brands.findFirst.mockResolvedValue({ id: BRAND_ID });
    prismaMock.tire_types.findFirst.mockResolvedValue(null);

    await expect(assertTireCatalogRefsInCompany(client, refs, COMPANY_A)).rejects.toThrow(
      'El tipo de cubierta no pertenece a la empresa'
    );
  });
});

// ─── Perímetro de sesión (dashboard) ─────────────────────────────────────────

describe('assertServiceOrderInActiveCompany', () => {
  it('devuelve la empresa activa y filtra la orden por ella', async () => {
    prismaMock.tire_service_orders.findFirst.mockResolvedValue({ id: ORDER_ID });

    await expect(assertServiceOrderInActiveCompany(ORDER_ID)).resolves.toBe(COMPANY_A);
    expect(prismaMock.tire_service_orders.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ORDER_ID, company_id: COMPANY_A } })
    );
  });

  it('lanza si la orden es de otra empresa', async () => {
    prismaMock.tire_service_orders.findFirst.mockResolvedValue(null);

    await expect(assertServiceOrderInActiveCompany(ORDER_ID)).rejects.toThrow(
      'La orden de gomería no pertenece a la empresa activa'
    );
  });
});

describe('assertVehicleInActiveCompany', () => {
  it('reusa la guarda por recurso con la empresa activa', async () => {
    prismaMock.vehicles.findFirst.mockResolvedValue({ id: VEHICLE_ID });

    await expect(assertVehicleInActiveCompany(VEHICLE_ID)).resolves.toBe(COMPANY_A);
    expect(prismaMock.vehicles.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VEHICLE_ID, company_id: COMPANY_A } })
    );
  });

  it('lanza si el vehículo es de otra empresa', async () => {
    prismaMock.vehicles.findFirst.mockResolvedValue(null);

    await expect(assertVehicleInActiveCompany(VEHICLE_ID)).rejects.toThrow(
      'El equipo no pertenece a la empresa de la orden'
    );
  });
});

describe('guardas de catálogo contra la empresa activa', () => {
  const cases = [
    ['assertTireInActiveCompany', assertTireInActiveCompany, prismaMock.tires, 'La cubierta no pertenece a la empresa activa'],
    [
      'assertTireBrandInActiveCompany',
      assertTireBrandInActiveCompany,
      prismaMock.tire_brands,
      'La marca de cubierta no pertenece a la empresa activa',
    ],
    [
      'assertTireTypeInActiveCompany',
      assertTireTypeInActiveCompany,
      prismaMock.tire_types,
      'El tipo de cubierta no pertenece a la empresa activa',
    ],
    [
      'assertTemplateInActiveCompany',
      assertTemplateInActiveCompany,
      prismaMock.tire_templates,
      'La plantilla de cubiertas no pertenece a la empresa activa',
    ],
    ['assertSubTypeInActiveCompany', assertSubTypeInActiveCompany, prismaMock.sub_type, 'El subtipo no pertenece a la empresa activa'],
  ] as const;

  it.each(cases)('%s: pasa con un recurso de la empresa activa y filtra por ella', async (_name, guard, model) => {
    model.findFirst.mockResolvedValue({ id: 'x' });

    await expect(guard('x')).resolves.toBe(COMPANY_A);
    expect(model.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'x', company_id: COMPANY_A } }));
  });

  it.each(cases)('%s: lanza con un recurso de otra empresa', async (_name, guard, model, message) => {
    model.findFirst.mockResolvedValue(null);

    await expect(guard('x')).rejects.toThrow(message);
  });
});
