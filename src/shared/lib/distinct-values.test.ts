import { describe, expect, it } from 'vitest';
import { buildDistinctFilters, DISTINCT_VALUE_TABLES } from './distinct-values';

const COMPANY = '2f1e0b4c-1d8a-4a2f-9b6f-0f0a1b2c3d4e';

describe('buildDistinctFilters', () => {
  it('lanza con una tabla no admitida', () => {
    expect(() => buildDistinctFilters('profile', null, COMPANY)).toThrow('Tabla no admitida para select_distinct_values');
    expect(() => buildDistinctFilters("vehicles; drop", null, COMPANY)).toThrow('Tabla no admitida');
  });

  it('fuerza company_id en tablas con company_id, mergeando con los filtros del cliente', () => {
    expect(buildDistinctFilters('vehicles', { is_active: 'true' }, COMPANY)).toEqual({
      is_active: 'true',
      company_id: COMPANY,
    });
    expect(buildDistinctFilters('vehicles', null, COMPANY)).toEqual({ company_id: COMPANY });
  });

  it('el cliente no puede pisar company_id (ni con "vehicles.company_id")', () => {
    expect(buildDistinctFilters('vehicles', { company_id: 'otra', 'vehicles.company_id': 'otra' }, COMPANY)).toEqual({
      company_id: COMPANY,
    });
  });

  it('documents_equipment ya no está admitida (sus facets pasaron a Prisma en P2 Task 4)', () => {
    expect(Object.keys(DISTINCT_VALUE_TABLES)).toEqual(['vehicles']);
    expect(() => buildDistinctFilters('documents_equipment', null, COMPANY)).toThrow('Tabla no admitida');
  });
});
