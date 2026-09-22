import { describe, expect, it } from 'vitest';
import {
  canHaveCompatibleItems,
  effectiveHitchTypeIds,
  formatCompatibleItemKey,
  parseCompatibleItemKeys,
  typeIdsWithoutSubTypes,
} from './hitch-compatibility';

describe('canHaveCompatibleItems', () => {
  it('requiere unidad tractora Y enganche', () => {
    expect(canHaveCompatibleItems({ is_tractor_unit: true, has_hitch: true })).toBe(true);
    expect(canHaveCompatibleItems({ is_tractor_unit: true, has_hitch: false })).toBe(false);
    expect(canHaveCompatibleItems({ is_tractor_unit: false, has_hitch: true })).toBe(false);
  });

  it('tolera nulls y ausencia de tipo', () => {
    expect(canHaveCompatibleItems({ is_tractor_unit: null, has_hitch: null })).toBe(false);
    expect(canHaveCompatibleItems(null)).toBe(false);
    expect(canHaveCompatibleItems(undefined)).toBe(false);
  });
});

describe('effectiveHitchTypeIds', () => {
  it('conserva los enganches de un tipo tractor con enganche', () => {
    expect(effectiveHitchTypeIds({ is_tractor_unit: true, has_hitch: true }, ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('descarta los enganches si el tipo dejó de ser tractor o de tener enganche', () => {
    expect(effectiveHitchTypeIds({ is_tractor_unit: false, has_hitch: true }, ['a'])).toEqual([]);
    expect(effectiveHitchTypeIds({ is_tractor_unit: true, has_hitch: false }, ['a'])).toEqual([]);
  });

  it('deduplica y descarta ids vacíos', () => {
    expect(effectiveHitchTypeIds({ is_tractor_unit: true, has_hitch: true }, ['a', 'a', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('typeIdsWithoutSubTypes', () => {
  it('deja fuera los tipos que ya tienen algún subtipo', () => {
    expect(typeIdsWithoutSubTypes(['t1', 't2', 't3'], [{ type: 't1' }, { type: 't3' }])).toEqual(['t2']);
  });

  it('sin subtipos cargados, todos los tipos se ofrecen enteros', () => {
    expect(typeIdsWithoutSubTypes(['t1', 't2'], [])).toEqual(['t1', 't2']);
  });

  it('ignora los subtipos huérfanos (type null) y deduplica la entrada', () => {
    expect(typeIdsWithoutSubTypes(['t1', 't1', 't2'], [{ type: null }, { type: 't2' }])).toEqual(['t1']);
  });
});

describe('parseCompatibleItemKeys / formatCompatibleItemKey', () => {
  it('es la inversa de formatCompatibleItemKey', () => {
    const items = [
      { id: 'aaa', type: 'sub_type' as const },
      { id: 'bbb', type: 'type' as const },
    ];
    expect(parseCompatibleItemKeys(items.map(formatCompatibleItemKey))).toEqual(items);
  });

  it('descarta claves malformadas o con item_type desconocido', () => {
    expect(parseCompatibleItemKeys(['sub_type:', ':abc', 'abc', '', 'vehicle:abc'])).toEqual([]);
  });

  it('deduplica claves repetidas', () => {
    expect(parseCompatibleItemKeys(['type:t1', 'type:t1', 'sub_type:t1'])).toEqual([
      { id: 't1', type: 'type' },
      { id: 't1', type: 'sub_type' },
    ]);
  });

  it('acepta ids que contienen dos puntos', () => {
    expect(parseCompatibleItemKeys(['sub_type:a:b'])).toEqual([{ id: 'a:b', type: 'sub_type' }]);
  });
});
