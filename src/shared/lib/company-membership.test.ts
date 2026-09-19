import { describe, expect, it } from 'vitest';
import { canAccessCompany } from './company-membership';

const profileId = 'profile-1';

describe('canAccessCompany', () => {
  it('permite al owner de la empresa', () => {
    expect(canAccessCompany({ profileId, company: { owner_id: profileId }, membership: null })).toBe(true);
  });

  it('permite a un miembro activo (share_company_users.is_active)', () => {
    expect(
      canAccessCompany({ profileId, company: { owner_id: 'otro-profile' }, membership: { is_active: true } })
    ).toBe(true);
  });

  it('rechaza a un miembro inactivo', () => {
    expect(
      canAccessCompany({ profileId, company: { owner_id: 'otro-profile' }, membership: { is_active: false } })
    ).toBe(false);
  });

  it('rechaza sin relación con la empresa (ni owner ni membership), incluso si la empresa no existe', () => {
    expect(canAccessCompany({ profileId, company: { owner_id: 'otro-profile' }, membership: null })).toBe(false);
    expect(canAccessCompany({ profileId, company: null, membership: null })).toBe(false);
    expect(canAccessCompany({ profileId, company: { owner_id: null }, membership: null })).toBe(false);
  });
});
