import { describe, expect, it } from 'vitest';
import { findTabDef } from './permissions-map-utils';

const map = {
  empresa: {
    tabs: {
      users: {
        slug: 'users',
        subtabs: {
          'gestion-roles': { slug: 'gestion-roles' },
          'detalle-usuario': { slug: 'detalle-usuario' },
        },
      },
      general: {
        slug: 'general',
        subtabs: {
          company: {
            slug: 'company',
            subtabs: {
              'cost-center': { slug: 'cost-center' },
            },
          },
        },
      },
    },
  },
  equipos: {
    tabs: {
      type_of_repairs: {
        slug: 'type_of_repairs',
        subtabs: {
          equipments_with_deviations: { slug: 'equipments_with_deviations' },
        },
      },
    },
  },
};

describe('findTabDef', () => {
  it('encuentra una tab de primer nivel', () => {
    expect(findTabDef(map, 'empresa', 'general')).toEqual(map.empresa.tabs.general);
  });

  it('encuentra una subtab de segundo nivel', () => {
    expect(findTabDef(map, 'empresa', 'gestion-roles')).toEqual(map.empresa.tabs.users.subtabs!['gestion-roles']);
  });

  it('encuentra una subtab de tercer nivel', () => {
    expect(findTabDef(map, 'empresa', 'cost-center')).toEqual(
      map.empresa.tabs.general.subtabs!.company.subtabs!['cost-center']
    );
  });

  it('busca sólo dentro del módulo indicado (no cruza módulos)', () => {
    expect(findTabDef(map, 'empresa', 'equipments_with_deviations')).toBeNull();
    expect(findTabDef(map, 'equipos', 'equipments_with_deviations')).toEqual(
      map.equipos.tabs.type_of_repairs.subtabs!.equipments_with_deviations
    );
  });

  it('retorna null si el módulo no existe', () => {
    expect(findTabDef(map, 'inexistente', 'general')).toBeNull();
  });

  it('retorna null si la tab no existe en el módulo', () => {
    expect(findTabDef(map, 'empresa', 'no-existe')).toBeNull();
  });
});
