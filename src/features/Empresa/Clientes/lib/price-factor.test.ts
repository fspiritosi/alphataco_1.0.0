import { describe, expect, it } from 'vitest';
import { applyFactor, indexFactor, polynomialFactor, PriceFactorError, sumWeights } from './price-factor';

/**
 * Esto multiplica precios de contratos. Un error acá no falla: sale un importe distinto en una
 * certificación que alguien firma.
 */
describe('polynomialFactor', () => {
  const componentes = [
    { name: 'Mano de obra', weight: '0.6', coefficient: '1.20' },
    { name: 'Combustible', weight: '0.25', coefficient: '1.10' },
    { name: 'Materiales', weight: '0.15', coefficient: '1.05' },
  ];

  it('calcula la suma ponderada', () => {
    // 0.6×1.20 + 0.25×1.10 + 0.15×1.05 = 0.72 + 0.275 + 0.1575 = 1.1525
    expect(polynomialFactor(componentes).toString()).toBe('1.1525');
  });

  it('no arrastra el error del punto flotante', () => {
    // Con `number`, 0.1+0.2 da 0.30000000000000004 y el factor saldría corrido.
    const f = polynomialFactor([
      { name: 'A', weight: '0.1', coefficient: '1' },
      { name: 'B', weight: '0.2', coefficient: '1' },
      { name: 'C', weight: '0.7', coefficient: '1' },
    ]);
    expect(f.toString()).toBe('1');
  });

  it('un factor de 1 deja el precio igual', () => {
    const iguales = componentes.map((c) => ({ ...c, coefficient: '1' }));
    expect(polynomialFactor(iguales).toString()).toBe('1');
  });

  it('rechaza una fórmula cuyos pesos no suman 1', () => {
    const incompleta = [
      { name: 'Mano de obra', weight: '0.6', coefficient: '1.20' },
      { name: 'Combustible', weight: '0.25', coefficient: '1.10' },
    ];
    // Suman 0.85: aplicarla daría un aumento menor al real, sin que nada avise.
    expect(() => polynomialFactor(incompleta)).toThrow(PriceFactorError);
    expect(sumWeights(incompleta).toString()).toBe('0.85');
  });

  it('rechaza pesos o coeficientes negativos', () => {
    expect(() => polynomialFactor([{ name: 'A', weight: '-1', coefficient: '1' }])).toThrow(PriceFactorError);
    expect(() =>
      polynomialFactor([
        { name: 'A', weight: '1', coefficient: '-1' },
      ])
    ).toThrow(PriceFactorError);
  });

  it('rechaza una fórmula vacía', () => {
    expect(() => polynomialFactor([])).toThrow(PriceFactorError);
  });
});

describe('indexFactor', () => {
  it('toma el coeficiente tal cual', () => {
    expect(indexFactor('1.15').toString()).toBe('1.15');
  });

  it('rechaza un coeficiente negativo', () => {
    expect(() => indexFactor(-1)).toThrow(PriceFactorError);
  });
});

describe('applyFactor', () => {
  it('multiplica y deja 4 decimales', () => {
    expect(applyFactor('1000', '1.1525').toString()).toBe('1152.5');
    // `toString()` no imprime los ceros a la derecha; la escala la fija la columna
    // `Decimal(15,4)` al guardar.
    expect(applyFactor('1234.5678', '1.15').toString()).toBe('1419.753');
    expect(applyFactor('1234.5678', '1.15').toFixed(4)).toBe('1419.7530');
  });

  it('redondea medio hacia arriba, que es como se hace la cuenta a mano', () => {
    expect(applyFactor('1', '1.00005').toString()).toBe('1.0001');
  });

  it('un factor de 1 no cambia el precio', () => {
    expect(applyFactor('999.1234', 1).toString()).toBe('999.1234');
  });
});
