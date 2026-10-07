import { describe, expect, it } from 'vitest';
import { serializeCustomer } from './serializers';

describe('serializeCustomer', () => {
  const base = {
    id: 'c1',
    name: 'Vista',
    cuit: BigInt('30712345678'),
    client_email: null,
    client_phone: BigInt('2995551234'),
    address: null,
    is_active: true,
    company_id: 'co1',
    reason_for_termination: null,
    termination_date: null,
    created_at: new Date(2026, 0, 1),
    vat_condition_id: null,
    fiscal_street: null,
    fiscal_city: null,
    fiscal_province_id: null,
    fiscal_postal_code: null,
  };

  it('bigint → string (cuit y teléfono)', () => {
    const row = serializeCustomer(base);
    expect(row.cuit).toBe('30712345678');
    expect(row.client_phone).toBe('2995551234');
  });

  it('teléfono nulo se conserva nulo', () => {
    expect(serializeCustomer({ ...base, client_phone: null }).client_phone).toBeNull();
  });
});
