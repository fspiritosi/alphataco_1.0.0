import { describe, expect, it } from 'vitest';
import { certificationTotal, lineAmount } from './certification-amounts';

describe('lineAmount', () => {
  it('multiplica cantidad por unitario y redondea a 2 decimales', () => {
    expect(lineAmount('3', '1000.50').toFixed(2)).toBe('3001.50');
  });

  it('redondea medio hacia arriba', () => {
    expect(lineAmount('1', '0.125').toFixed(2)).toBe('0.13');
  });

  it('conserva la precisión del unitario de 4 decimales antes de redondear', () => {
    // 7 × 1234.5678 = 8641.9746 → 8641.97
    expect(lineAmount('7', '1234.5678').toFixed(2)).toBe('8641.97');
  });
});

describe('certificationTotal', () => {
  it('suma importes ya redondeados', () => {
    expect(certificationTotal(['10.01', '20.02', '30.03']).toFixed(2)).toBe('60.06');
  });

  it('el total coincide con la suma de lo impreso, no con el redondeo de la suma exacta', () => {
    // Tres líneas de 1 × 0.005. Redondeando cada una: 0.01 × 3 = 0.03.
    // Sumando exacto y redondeando al final daría 0.015 → 0.02, que NO es lo que suma el papel.
    const importes = [lineAmount('1', '0.005'), lineAmount('1', '0.005'), lineAmount('1', '0.005')];
    expect(certificationTotal(importes).toFixed(2)).toBe('0.03');
  });

  it('sin líneas da cero', () => {
    expect(certificationTotal([]).toFixed(2)).toBe('0.00');
  });

  it('no arrastra el error del punto flotante', () => {
    const importes = Array.from({ length: 10 }, () => lineAmount('1', '0.1'));
    expect(certificationTotal(importes).toFixed(2)).toBe('1.00');
  });
});

/**
 * Contraste contra una implementación independiente.
 *
 * Los valores esperados salen de `SELECT round(cantidad * unitario, 2)` corrido en el Postgres
 * del proyecto con datos reales. Que dos implementaciones distintas den lo mismo es lo que
 * convierte "mi función parece correcta" en evidencia.
 */
describe('coincide con el redondeo de Postgres', () => {
  const casos: [string, string, string][] = [
    // cantidad, unitario, lo que devolvió `round(q * p, 2)` en la base
    ['3', '1234.5678', '3703.70'],
    ['1', '0.125', '0.13'],
    ['7', '1234.5678', '8641.97'],
    ['2.5', '100.0001', '250.00'],
  ];

  it.each(casos)('%s × %s = %s', (quantity, unitPrice, esperado) => {
    expect(lineAmount(quantity, unitPrice).toFixed(2)).toBe(esperado);
  });
});
