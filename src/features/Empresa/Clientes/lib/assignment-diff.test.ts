import { describe, expect, it } from 'vitest';
import { diffAssignments, normalizeIds, resolveAssignmentChanges } from './assignment-diff';

describe('diffAssignments', () => {
  it('calcula altas y bajas entre lo vigente y la selección', () => {
    expect(diffAssignments(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual({ toAdd: ['d'], toRemove: ['a'] });
  });

  it('sin cambios → listas vacías', () => {
    expect(diffAssignments(['a', 'b'], ['b', 'a'])).toEqual({ toAdd: [], toRemove: [] });
  });

  it('selección vacía → todas las vigentes son bajas (el llamador decide si confirmarlas)', () => {
    expect(diffAssignments(['a', 'b'], [])).toEqual({ toAdd: [], toRemove: ['a', 'b'] });
  });

  it('ignora vacíos/nulos y duplicados en ambos lados', () => {
    expect(diffAssignments(['a', 'a', ''], ['b', 'b', '', 'a'])).toEqual({ toAdd: ['b'], toRemove: [] });
  });

  it('acepta una selección undefined como vacía', () => {
    expect(diffAssignments(['a'], undefined)).toEqual({ toAdd: [], toRemove: ['a'] });
  });
});

describe('normalizeIds', () => {
  it('deduplica, recorta y descarta vacíos', () => {
    expect(normalizeIds([' a ', 'a', '', null, undefined, 'b'])).toEqual(['a', 'b']);
  });

  it('no-array → []', () => {
    expect(normalizeIds(undefined)).toEqual([]);
  });
});

describe('resolveAssignmentChanges', () => {
  it('normaliza add/remove y ante conflicto prevalece el alta', () => {
    expect(resolveAssignmentChanges({ add: ['a', 'b', 'b'], remove: ['b', 'c', ''] })).toEqual({
      toAdd: ['a', 'b'],
      toRemove: ['c'],
    });
  });

  it('sin cambios → vacío', () => {
    expect(resolveAssignmentChanges({ add: [], remove: [] })).toEqual({ toAdd: [], toRemove: [] });
  });
});
