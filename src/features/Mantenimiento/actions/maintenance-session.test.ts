import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Perímetro de las dos actions que fijan la empresa activa del flujo del QR.
 *
 * `completeMaintenanceEmployeeAnonymousSession` escribe el claim `app_metadata.company`, que
 * `getActiveCompanyId()` trata como de confianza y NO revalida: que la sesión sea anónima es
 * lo que impide que un usuario del dashboard se plante la empresa de otro en su propia cuenta.
 */

const prismaMock = vi.hoisted(() => ({
  employees: { findFirst: vi.fn() },
  vehicles: { findUnique: vi.fn() },
  profile: { upsert: vi.fn(), findFirst: vi.fn() },
}));
vi.mock('@/shared/lib/prisma', () => ({ prisma: prismaMock }));

vi.mock('@/shared/lib/session', () => ({
  getSessionUser: vi.fn(),
  isSessionAnonymous: vi.fn(),
}));

const tenantMock = vi.hoisted(() => ({
  setActiveCompanyCookie: vi.fn(),
  clearActiveCompanyCookie: vi.fn(),
  getActiveCompanyId: vi.fn(),
}));
vi.mock('@/shared/lib/tenant', () => tenantMock);

const updateUserById = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/lib/supabase/server', () => ({
  adminSupabaseServer: async () => ({ auth: { admin: { updateUserById } } }),
  supabaseServer: async () => ({ auth: { signOut: vi.fn() } }),
}));

import { getSessionUser, isSessionAnonymous } from '@/shared/lib/session';
import {
  completeMaintenanceEmployeeAnonymousSession,
  setActiveCompanyForEquipment,
} from './maintenance-actions';

const EQUIPMENT = 'equipment-1';
const COMPANY_A = 'company-a';

describe('completeMaintenanceEmployeeAnonymousSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({ id: 'user-1', email: null });
    vi.mocked(isSessionAnonymous).mockResolvedValue(true);
    prismaMock.employees.findFirst.mockResolvedValue({
      id: 'emp-1',
      firstname: 'Juan',
      lastname: 'Perez',
      email: null,
      phone: null,
      company_id: COMPANY_A,
      is_active: true,
    });
    prismaMock.profile.findFirst.mockResolvedValue(null);
    prismaMock.profile.upsert.mockResolvedValue({ id: 'user-1' });
  });

  it('completa la sesión del operario anónimo y fija la empresa del legajo', async () => {
    const result = await completeMaintenanceEmployeeAnonymousSession({ cuil: '20-12345678-9', equipmentId: EQUIPMENT });

    expect(result).toMatchObject({ ok: true, companyId: COMPANY_A, employeeId: 'emp-1' });
    expect(updateUserById).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ app_metadata: expect.objectContaining({ company: COMPANY_A }) })
    );
  });

  it('rechaza una sesión de dashboard: no escribe el claim de empresa ni el de empleado', async () => {
    vi.mocked(isSessionAnonymous).mockResolvedValue(false);

    const result = await completeMaintenanceEmployeeAnonymousSession({ cuil: '20-12345678-9', equipmentId: EQUIPMENT });

    expect(result.ok).toBe(false);
    expect(updateUserById).not.toHaveBeenCalled();
    // Tampoco llega al upsert que pisaría el profile del usuario de dashboard.
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
    expect(prismaMock.employees.findFirst).not.toHaveBeenCalled();
    expect(tenantMock.setActiveCompanyCookie).not.toHaveBeenCalled();
  });

  it('rechaza sin sesión', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const result = await completeMaintenanceEmployeeAnonymousSession({ cuil: '20-12345678-9', equipmentId: EQUIPMENT });

    expect(result.ok).toBe(false);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});

describe('setActiveCompanyForEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({ id: 'user-1', email: null });
    prismaMock.vehicles.findUnique.mockResolvedValue({ company_id: COMPANY_A });
  });

  it('propone la empresa del equipo escaneado cuando hay sesión', async () => {
    const result = await setActiveCompanyForEquipment(EQUIPMENT);

    expect(result).toMatchObject({ ok: true, companyId: COMPANY_A });
    expect(tenantMock.setActiveCompanyCookie).toHaveBeenCalledWith(COMPANY_A);
  });

  it('sin sesión no escribe la cookie', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const result = await setActiveCompanyForEquipment(EQUIPMENT);

    expect(result.ok).toBe(false);
    expect(tenantMock.setActiveCompanyCookie).not.toHaveBeenCalled();
    expect(prismaMock.vehicles.findUnique).not.toHaveBeenCalled();
  });
});
