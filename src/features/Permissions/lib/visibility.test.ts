import { describe, expect, it } from 'vitest';
import type { TabDefLike } from './permissions-map-utils';
import { hasInferredView } from './visibility';

const tabWithSubtabs: TabDefLike = {
  slug: 'users',
  subtabs: {
    'gestion-roles': { slug: 'gestion-roles' },
    'detalle-usuario': {
      slug: 'detalle-usuario',
      subtabs: {
        'accesos-externos': { slug: 'accesos-externos' },
      },
    },
  },
};

describe('hasInferredView', () => {
  it('retorna false si la tab no tiene subtabs', () => {
    expect(hasInferredView({ slug: 'principal' }, new Set(['principal']))).toBe(false);
  });

  it('retorna false si no hay definición de tab', () => {
    expect(hasInferredView(null, new Set(['gestion-roles']))).toBe(false);
    expect(hasInferredView(undefined, new Set(['gestion-roles']))).toBe(false);
  });

  it('retorna true si una subtab de primer nivel tiene view concedido', () => {
    expect(hasInferredView(tabWithSubtabs, new Set(['gestion-roles']))).toBe(true);
  });

  it('retorna true si una subtab de segundo nivel (nieta) tiene view concedido', () => {
    expect(hasInferredView(tabWithSubtabs, new Set(['accesos-externos']))).toBe(true);
  });

  it('retorna false si ninguna subtab tiene view concedido', () => {
    expect(hasInferredView(tabWithSubtabs, new Set(['otro-tab-sin-relacion']))).toBe(false);
  });

  it('retorna false con el set vacío', () => {
    expect(hasInferredView(tabWithSubtabs, new Set())).toBe(false);
  });
});
