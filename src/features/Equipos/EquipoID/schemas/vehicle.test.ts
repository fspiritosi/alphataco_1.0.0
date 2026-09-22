import { describe, expect, it } from 'vitest';
import { isValidDomainForYear, vehicleInputSchema } from './vehicle';

describe('isValidDomainForYear', () => {
  it('hasta 2015: AAA000 o AAA00', () => {
    expect(isValidDomainForYear('abc123', 2010)).toBe(true);
    expect(isValidDomainForYear('ABC12', 2015)).toBe(true);
    expect(isValidDomainForYear('AB123CD', 2015)).toBe(false);
  });
  it('2016: cualquiera de los tres formatos', () => {
    expect(isValidDomainForYear('AB123CD', 2016)).toBe(true);
    expect(isValidDomainForYear('ABC123', 2016)).toBe(true);
    expect(isValidDomainForYear('ABC12', 2016)).toBe(true);
    expect(isValidDomainForYear('ABCD12', 2016)).toBe(false);
  });
  it('desde 2017: AA000AA o AAA00', () => {
    expect(isValidDomainForYear('AB123CD', 2020)).toBe(true);
    expect(isValidDomainForYear('ABC12', 2020)).toBe(true);
    expect(isValidDomainForYear('ABC123', 2020)).toBe(false);
  });
});

const UUID = '2f1e0b4c-1d8a-4a2f-9b6f-0f0a1b2c3d4e';

describe('vehicleInputSchema', () => {
  const base = {
    type_of_vehicle: '1',
    brand: '3',
    model: '7',
    year: '2020',
    type: UUID,
    cost_type: 'Directo' as const,
  };

  it('convierte "" a null en las FK opcionales (uuid/int) y conserva el resto', () => {
    const parsed = vehicleInputSchema.parse({ ...base, subType: '', owner_id: '', cost_center_id: '', sector: '', model: '' });
    expect(parsed.subType).toBeNull();
    expect(parsed.owner_id).toBeNull();
    expect(parsed.cost_center_id).toBeNull();
    expect(parsed.sector).toBeNull();
    expect(parsed.model).toBeNull();
    expect(parsed.has_certification).toBe(false);
  });

  it('acepta las fechas como Date o YYYY-MM-DD y rechaza otros formatos', () => {
    expect(vehicleInputSchema.parse({ ...base, certification_expiration_date: '2026-09-15' }).certification_expiration_date).toBe(
      '2026-09-15'
    );
    const d = new Date('2026-09-15T03:00:00.000Z');
    expect(vehicleInputSchema.parse({ ...base, contract_start_date: d }).contract_start_date).toEqual(d);
    expect(vehicleInputSchema.safeParse({ ...base, contract_start_date: '15/09/2026' }).success).toBe(false);
  });

  it('exige uuid en type y en allocated_to, e int en brand/type_of_vehicle', () => {
    expect(vehicleInputSchema.safeParse({ ...base, type: 'x' }).success).toBe(false);
    expect(vehicleInputSchema.parse({ ...base, type: '' }).type).toBeNull();
    expect(vehicleInputSchema.safeParse({ ...base, allocated_to: ['no-uuid'] }).success).toBe(false);
    expect(vehicleInputSchema.safeParse({ ...base, brand: 'abc' }).success).toBe(false);
    expect(vehicleInputSchema.safeParse({ ...base, allocated_to: [UUID] }).success).toBe(true);
  });
});
