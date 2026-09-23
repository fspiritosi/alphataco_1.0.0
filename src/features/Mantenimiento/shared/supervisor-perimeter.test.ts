import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  profile: { findFirst: vi.fn() },
}));
vi.mock('@/shared/lib/prisma', () => ({ prisma: prismaMock }));

import { assertSupervisorInCompany } from './supervisor-perimeter';

const SUPERVISOR = 'profile-1';
const COMPANY = 'company-1';

describe('assertSupervisorInCompany', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exige una pertenencia ACTIVA a la empresa del recurso', async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: SUPERVISOR });

    await expect(assertSupervisorInCompany(SUPERVISOR, COMPANY)).resolves.toBeUndefined();
    expect(prismaMock.profile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: SUPERVISOR,
          share_company_users: { some: { company_id: COMPANY, is_active: true } },
        },
      })
    );
  });

  it('rechaza al supervisor sin pertenencia activa en esa empresa', async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null);

    await expect(assertSupervisorInCompany(SUPERVISOR, COMPANY)).rejects.toThrow(
      'El supervisor elegido no pertenece a la empresa del equipo'
    );
  });
});
