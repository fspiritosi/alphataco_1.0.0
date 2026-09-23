import { describe, expect, it } from 'vitest';
import { fromDateOnly, toDateOnly } from './date-only';

describe('toDateOnly', () => {
  it('Date a medianoche UTC (como devuelve Prisma para @db.Date) → el mismo día', () => {
    expect(toDateOnly(new Date('2026-09-15T00:00:00.000Z'))).toBe('2026-09-15');
  });
  it('texto ISO completo → día UTC; YYYY-MM-DD se conserva; null/undefined/"" → null', () => {
    expect(toDateOnly('2026-09-15T00:00:00.000Z')).toBe('2026-09-15');
    expect(toDateOnly('2026-09-15')).toBe('2026-09-15');
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
    expect(toDateOnly('')).toBeNull();
  });
  it('fecha inválida lanza', () => {
    expect(() => toDateOnly(new Date('x'))).toThrow('Fecha inválida');
    expect(() => toDateOnly('15/09/2026')).toThrow('Fecha inválida');
  });
});

describe('fromDateOnly', () => {
  it('YYYY-MM-DD → Date a medianoche UTC', () => {
    expect(fromDateOnly('2026-09-15')).toEqual(new Date('2026-09-15T00:00:00.000Z'));
  });
  it('Date local → su fecha local a medianoche UTC (no corre el día)', () => {
    expect(fromDateOnly(new Date(2026, 8, 15, 23, 30))).toEqual(new Date('2026-09-15T00:00:00.000Z'));
    expect(fromDateOnly(new Date(2026, 0, 1, 0, 5))).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });
  it('null/undefined/"" → null; inválida lanza', () => {
    expect(fromDateOnly(null)).toBeNull();
    expect(fromDateOnly('')).toBeNull();
    expect(() => fromDateOnly('2026-13-45')).toThrow('Fecha inválida');
    expect(() => fromDateOnly('ayer')).toThrow('Fecha inválida');
  });
  it('ida y vuelta es estable', () => {
    expect(toDateOnly(fromDateOnly('2026-02-28'))).toBe('2026-02-28');
  });
});
