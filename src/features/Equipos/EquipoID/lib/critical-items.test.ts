import { describe, expect, it } from 'vitest';
import { parseCriticalItemLabels, summarizeCriticalItems } from './critical-items';

describe('parseCriticalItemLabels', () => {
  it('array de strings JSON con item_label → labels', () => {
    expect(
      parseCriticalItemLabels([
        JSON.stringify({ item_code: 'FRE-01', item_label: 'Frenos' }),
        JSON.stringify({ item_code: 'LUZ-02' }),
      ])
    ).toEqual(['Frenos', 'LUZ-02']);
  });

  it('strings simples y objetos ya parseados', () => {
    expect(parseCriticalItemLabels(['Neumáticos', { item_label: 'Luces' }, { item_code: 'X-1' }])).toEqual([
      'Neumáticos',
      'Luces',
      'X-1',
    ]);
  });

  it('un string JSON con el array entero (formato legacy) y un objeto suelto', () => {
    expect(parseCriticalItemLabels(JSON.stringify([{ item_label: 'A' }, 'B']))).toEqual(['A', 'B']);
    expect(parseCriticalItemLabels({ item_label: 'Solo' })).toEqual(['Solo']);
    expect(parseCriticalItemLabels({ foo: 1 })).toEqual(['{"foo":1}']);
  });

  it('null / undefined / vacío → []', () => {
    expect(parseCriticalItemLabels(null)).toEqual([]);
    expect(parseCriticalItemLabels(undefined)).toEqual([]);
    expect(parseCriticalItemLabels([])).toEqual([]);
    expect(parseCriticalItemLabels('')).toEqual([]);
  });

  it('un string que no es JSON se toma tal cual', () => {
    expect(parseCriticalItemLabels('Frenos sin fuerza')).toEqual(['Frenos sin fuerza']);
  });
});

describe('summarizeCriticalItems', () => {
  it('muestra hasta 2 labels y agrega "..." si hay más', () => {
    expect(summarizeCriticalItems(['A', 'B', 'C'])).toBe('A, B...');
    expect(summarizeCriticalItems(['A'])).toBe('A');
    expect(summarizeCriticalItems([])).toBe('');
  });
});
