import { describe, expect, it } from 'vitest';
import { DEFAULT_ROW_QUANTITY, resolveRowQuantity } from './row-quantity';

/**
 * La regla: cada línea vale 1 salvo que venga una cantidad explícita. Esta función multiplica
 * precios, así que cada camino que devuelve algo distinto de lo esperado es un importe mal
 * calculado en una certificación.
 */
describe('resolveRowQuantity', () => {
  it('sin cantidad explícita devuelve 1', () => {
    expect(resolveRowQuantity(undefined).toString()).toBe('1');
    expect(resolveRowQuantity(null).toString()).toBe('1');
    expect(resolveRowQuantity('').toString()).toBe('1');
  });

  it('respeta la cantidad explícita del preparte', () => {
    expect(resolveRowQuantity(3).toString()).toBe('3');
    expect(resolveRowQuantity('2.5').toString()).toBe('2.5');
  });

  it('conserva los decimales sin pasar por number', () => {
    // 0.1 + 0.2 en punto flotante da 0.30000000000000004; con Decimal no.
    const total = resolveRowQuantity('0.1').plus(resolveRowQuantity('0.2'));
    expect(total.toString()).toBe('0.3');
  });

  it('acepta el cero explícito: no es lo mismo que "sin cantidad"', () => {
    expect(resolveRowQuantity(0).toString()).toBe('0');
    expect(resolveRowQuantity('0').toString()).toBe('0');
  });

  it('cae al default ante un valor no numérico en vez de propagar basura', () => {
    expect(resolveRowQuantity('abc').toString()).toBe('1');
  });

  it('cae al default ante una cantidad negativa', () => {
    // La base también la rechaza por CHECK; acá se evita llegar a ese error.
    expect(resolveRowQuantity(-5).toString()).toBe('1');
  });

  it('el default es exactamente 1', () => {
    expect(DEFAULT_ROW_QUANTITY.toString()).toBe('1');
  });
});
