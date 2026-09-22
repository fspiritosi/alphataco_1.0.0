import { describe, expect, it } from 'vitest';
import {
  buildDiagramDayRangeWhere,
  compareDiagramDays,
  diagramDayKey,
  enumerateDiagramDays,
  isActiveDayInCycle,
  toDiagramDay,
} from './diagram-dates';

describe('toDiagramDay', () => {
  it('convierte una fecha ISO (YYYY-MM-DD) a día/mes/año numéricos', () => {
    expect(toDiagramDay('2026-03-07')).toEqual({ year: 2026, month: 3, day: 7 });
  });

  it('convierte un Date usando la fecha local (sin correr el día por la zona horaria)', () => {
    expect(toDiagramDay(new Date(2026, 0, 31, 23, 30))).toEqual({ year: 2026, month: 1, day: 31 });
  });

  it('rechaza una fecha inválida', () => {
    expect(() => toDiagramDay('no-es-fecha')).toThrow(/Fecha inválida/);
  });
});

describe('diagramDayKey / compareDiagramDays', () => {
  it('arma la clave YYYY-MM-DD con ceros a la izquierda', () => {
    expect(diagramDayKey({ year: 2026, month: 1, day: 5 })).toBe('2026-01-05');
  });

  it('ordena cronológicamente', () => {
    const a = { year: 2025, month: 12, day: 31 };
    const b = { year: 2026, month: 1, day: 1 };
    expect(compareDiagramDays(a, b)).toBeLessThan(0);
    expect(compareDiagramDays(b, a)).toBeGreaterThan(0);
    expect(compareDiagramDays(a, { ...a })).toBe(0);
  });
});

describe('enumerateDiagramDays', () => {
  it('devuelve cada día del rango, extremos incluidos, cruzando el mes', () => {
    const days = enumerateDiagramDays({ year: 2026, month: 1, day: 30 }, { year: 2026, month: 2, day: 2 });
    expect(days.map(diagramDayKey)).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });

  it('un solo día cuando from === to', () => {
    expect(enumerateDiagramDays({ year: 2026, month: 5, day: 5 }, { year: 2026, month: 5, day: 5 })).toHaveLength(1);
  });

  it('rango invertido → vacío', () => {
    expect(enumerateDiagramDays({ year: 2026, month: 5, day: 6 }, { year: 2026, month: 5, day: 5 })).toEqual([]);
  });
});

describe('buildDiagramDayRangeWhere', () => {
  it('mismo mes: una sola condición con day entre from y to', () => {
    expect(buildDiagramDayRangeWhere({ year: 2026, month: 3, day: 5 }, { year: 2026, month: 3, day: 20 })).toEqual({
      year: 2026,
      month: 3,
      day: { gte: 5, lte: 20 },
    });
  });

  it('meses consecutivos del mismo año: cola del primero + cabeza del segundo', () => {
    expect(buildDiagramDayRangeWhere({ year: 2026, month: 3, day: 25 }, { year: 2026, month: 4, day: 3 })).toEqual({
      OR: [
        { year: 2026, month: 3, day: { gte: 25 } },
        { year: 2026, month: 4, day: { lte: 3 } },
      ],
    });
  });

  it('mismo año con meses completos en el medio (el bug del legacy: los meses intermedios no se traían)', () => {
    expect(buildDiagramDayRangeWhere({ year: 2026, month: 1, day: 15 }, { year: 2026, month: 4, day: 10 })).toEqual({
      OR: [
        { year: 2026, month: 1, day: { gte: 15 } },
        { year: 2026, month: { gt: 1, lt: 4 } },
        { year: 2026, month: 4, day: { lte: 10 } },
      ],
    });
  });

  it('cruce de año: resto del primer año, años completos y comienzo del último', () => {
    expect(buildDiagramDayRangeWhere({ year: 2024, month: 11, day: 20 }, { year: 2026, month: 2, day: 5 })).toEqual({
      OR: [
        { year: 2024, month: 11, day: { gte: 20 } },
        { year: 2024, month: { gt: 11 } },
        { year: { gt: 2024, lt: 2026 } },
        { year: 2026, month: { lt: 2 } },
        { year: 2026, month: 2, day: { lte: 5 } },
      ],
    });
  });

  it('cruce de año desde diciembre a enero no agrega meses vacíos', () => {
    expect(buildDiagramDayRangeWhere({ year: 2025, month: 12, day: 30 }, { year: 2026, month: 1, day: 2 })).toEqual({
      OR: [
        { year: 2025, month: 12, day: { gte: 30 } },
        { year: 2026, month: 1, day: { lte: 2 } },
      ],
    });
  });

  it('rango invertido lanza', () => {
    expect(() => buildDiagramDayRangeWhere({ year: 2026, month: 2, day: 1 }, { year: 2026, month: 1, day: 1 })).toThrow(
      /Rango de fechas inválido/
    );
  });
});

describe('isActiveDayInCycle', () => {
  it('ciclo 4x4 contado desde la fecha de inicio (misma fórmula que process_massive_diagram_creation_v2)', () => {
    const cycle = Array.from({ length: 10 }, (_, i) => isActiveDayInCycle(i, 4, 4));
    expect(cycle).toEqual([true, true, true, true, false, false, false, false, true, true]);
  });

  it('sin días inactivos, todos los días son activos', () => {
    expect(isActiveDayInCycle(7, 5, 0)).toBe(true);
  });

  it('ciclo sin días (0/0) no divide por cero: se considera activo', () => {
    expect(isActiveDayInCycle(3, 0, 0)).toBe(true);
  });
});
