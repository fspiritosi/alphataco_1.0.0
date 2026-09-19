import { describe, expect, it } from 'vitest';
import { withCompany } from './prisma-tenant';
describe('withCompany', () => {
  it('agrega company_id al where', () => {
    expect(withCompany({ is_active: true }, 'c1')).toEqual({ is_active: true, company_id: 'c1' });
  });
  it('sobrescribe un company_id ajeno', () => {
    expect(withCompany({ company_id: 'otro' }, 'c1').company_id).toBe('c1');
  });
  it('acepta where undefined', () => {
    expect(withCompany(undefined, 'c1')).toEqual({ company_id: 'c1' });
  });
});
