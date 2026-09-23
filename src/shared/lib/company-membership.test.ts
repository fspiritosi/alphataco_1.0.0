import { describe, expect, it } from 'vitest';
import { canAccessCompany, canUseCompanyAsTenant } from './company-membership';

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

describe('canUseCompanyAsTenant', () => {
  const noLinks = { profileId, company: { owner_id: 'otro-profile' }, membership: null };

  it('acepta todo lo que acepta canAccessCompany (owner y miembro activo)', () => {
    expect(canUseCompanyAsTenant({ ...noLinks, company: { owner_id: profileId }, hasEmployeeInCompany: false })).toBe(
      true
    );
    expect(canUseCompanyAsTenant({ ...noLinks, membership: { is_active: true }, hasEmployeeInCompany: false })).toBe(
      true
    );
  });

  it('acepta al operario: no es miembro pero su empleado es de esa empresa', () => {
    expect(canUseCompanyAsTenant({ ...noLinks, hasEmployeeInCompany: true })).toBe(true);
  });

  it('acepta al operario aunque su membership esté dada de baja', () => {
    expect(canUseCompanyAsTenant({ ...noLinks, membership: { is_active: false }, hasEmployeeInCompany: true })).toBe(
      true
    );
  });

  it('rechaza sin ningún vínculo: ni owner, ni miembro activo, ni empleado', () => {
    expect(canUseCompanyAsTenant({ ...noLinks, hasEmployeeInCompany: false })).toBe(false);
    expect(canUseCompanyAsTenant({ ...noLinks, company: null, hasEmployeeInCompany: false })).toBe(false);
    expect(
      canUseCompanyAsTenant({ ...noLinks, membership: { is_active: false }, hasEmployeeInCompany: false })
    ).toBe(false);
  });
});
