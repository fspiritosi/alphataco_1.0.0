import { describe, expect, it } from 'vitest';
import { filterByActiveFlag } from './active-filter';

const rows = [
  { id: 'a', is_active: true },
  { id: 'b', is_active: false },
  { id: 'c', is_active: null as boolean | null },
];

describe('filterByActiveFlag', () => {
  it('muestra sólo los activos cuando el toggle está en "activos"', () => {
    expect(filterByActiveFlag(rows, 'is_active', true).map((r) => r.id)).toEqual(['a']);
  });

  it('muestra los inactivos, incluidos los que tienen la bandera en null', () => {
    expect(filterByActiveFlag(rows, 'is_active', false).map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('derivar de datos nuevos devuelve filas nuevas (no hay estado congelado)', () => {
    const before = filterByActiveFlag(rows, 'is_active', true);
    const after = filterByActiveFlag([...rows, { id: 'd', is_active: true }], 'is_active', true);
    expect(before.map((r) => r.id)).toEqual(['a']);
    expect(after.map((r) => r.id)).toEqual(['a', 'd']);
  });

  it('tolera datos ausentes', () => {
    expect(filterByActiveFlag(null, 'is_active', true)).toEqual([]);
    expect(filterByActiveFlag(undefined, 'is_active', true)).toEqual([]);
  });
});
