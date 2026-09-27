import { Prisma } from '@/generated/prisma/client';
import { describe, expect, it } from 'vitest';
import { priceChanged } from './price-revision-writer';

const d = (v: string) => new Prisma.Decimal(v);

describe('priceChanged', () => {
  it('detecta un aumento', () => {
    expect(priceChanged(d('1000'), d('1150'))).toBe(true);
  });

  it('detecta una baja', () => {
    expect(priceChanged(d('1150'), d('1000'))).toBe(true);
  });

  it('el mismo valor no es un cambio', () => {
    expect(priceChanged(d('1000'), d('1000'))).toBe(false);
  });

  // La razón de comparar por valor: la columna es Decimal(15,4), así que la base devuelve
  // '1000.0000' donde el form manda '1000'. Comparar el texto generaría una revisión fantasma
  // cada vez que se guarda el ítem sin tocar el precio.
  it('los ceros de la escala no son un cambio', () => {
    expect(priceChanged(d('1000.0000'), d('1000'))).toBe(false);
    expect(priceChanged(d('10.5'), d('10.5000'))).toBe(false);
  });

  // Y la razón de no usar `!==`: Decimal es un objeto, así que dos instancias del mismo número
  // nunca son la misma referencia.
  it('dos instancias del mismo número no son un cambio', () => {
    const a = d('1234.5678');
    const b = d('1234.5678');
    expect(a === b).toBe(false);
    expect(priceChanged(a, b)).toBe(false);
  });

  it('distingue en el cuarto decimal, que es la escala de la columna', () => {
    expect(priceChanged(d('10.0001'), d('10.0002'))).toBe(true);
  });
});
