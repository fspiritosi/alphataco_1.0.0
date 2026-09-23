import { contract_type_vehicles_enum } from '@/generated/prisma/enums';
import moment from 'moment';
import { describe, expect, it } from 'vitest';
import {
  categoryForContractType,
  computeDaysElapsed,
  CONTRACT_TYPES_BY_CATEGORY,
  emptyTypeMap,
  toSortedOptions,
} from './ownership';

describe('categoryForContractType', () => {
  it('agrupa Prendado con Leasing', () => {
    expect(categoryForContractType(contract_type_vehicles_enum.Prendado)).toBe('Leasing');
    expect(categoryForContractType(contract_type_vehicles_enum.Leasing)).toBe('Leasing');
  });

  it('mapea Propio y Alquiler a sus categorías', () => {
    expect(categoryForContractType(contract_type_vehicles_enum.Propio)).toBe('Propios');
    expect(categoryForContractType(contract_type_vehicles_enum.Alquiler)).toBe('Contratados');
  });

  it('sin tipo de contrato cuenta como propio', () => {
    expect(categoryForContractType(null)).toBe('Propios');
    expect(categoryForContractType(undefined)).toBe('Propios');
  });

  it('cada categoría vuelve a sus tipos de contrato', () => {
    for (const [category, types] of Object.entries(CONTRACT_TYPES_BY_CATEGORY)) {
      for (const type of types) {
        expect(categoryForContractType(type)).toBe(category);
      }
    }
  });
});

describe('computeDaysElapsed', () => {
  const now = new Date('2026-09-23T12:00:00Z');

  it('en el mes en curso cuenta hasta hoy inclusive', () => {
    expect(computeDaysElapsed(moment('2026-09-01'), now)).toBe(23);
  });

  it('en un mes pasado cuenta el mes completo', () => {
    expect(computeDaysElapsed(moment('2026-02-01'), now)).toBe(28);
  });

  it('en un mes futuro cuenta 0', () => {
    expect(computeDaysElapsed(moment('2026-10-01'), now)).toBe(0);
  });
});

describe('emptyTypeMap', () => {
  it('arranca con un mapa vacío por categoría', () => {
    const map = emptyTypeMap();

    expect(Object.keys(map)).toEqual(['Propios', 'Leasing', 'Contratados']);
    expect(map.Propios.size).toBe(0);
  });
});

describe('toSortedOptions', () => {
  it('ordena las opciones por nombre', () => {
    const options = toSortedOptions(
      new Map([
        ['2', 'Correctivo'],
        ['1', 'Preventivo'],
      ])
    );

    expect(options).toEqual([
      { id: '2', name: 'Correctivo' },
      { id: '1', name: 'Preventivo' },
    ]);
  });

  it('con un mapa vacío devuelve lista vacía', () => {
    expect(toSortedOptions(new Map())).toEqual([]);
  });
});
