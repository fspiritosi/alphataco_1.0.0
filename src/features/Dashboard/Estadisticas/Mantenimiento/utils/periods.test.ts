import moment from 'moment';
import { describe, expect, it } from 'vitest';
import {
  formatPeriodLabel,
  formatPeriodLabelShort,
  isLastNavigablePeriod,
  resolvePeriodRange,
  shiftAnchor,
} from './periods';

/**
 * El navegador de períodos (tickets 680/682) manda anclas desde la URL: estas pruebas
 * fijan el rango semiabierto que sale hacia el `where` de Prisma y el comportamiento con
 * anclas inválidas.
 */
describe('resolvePeriodRange', () => {
  it('devuelve el rango semiabierto del mes', () => {
    const { start, end } = resolvePeriodRange('month', '2026-09-17');

    expect(start.format('YYYY-MM-DD')).toBe('2026-09-01');
    expect(end.format('YYYY-MM-DD')).toBe('2026-10-01');
  });

  it('devuelve el trimestre que contiene al ancla', () => {
    const { start, end } = resolvePeriodRange('quarter', '2026-09-17');

    expect(start.format('YYYY-MM-DD')).toBe('2026-07-01');
    expect(end.format('YYYY-MM-DD')).toBe('2026-10-01');
  });

  it('el día es un rango de 24 horas', () => {
    const { start, end } = resolvePeriodRange('day', '2026-09-17');

    expect(end.diff(start, 'days')).toBe(1);
  });

  it('un ancla inválida cae en el período de hoy en vez de romper', () => {
    const { start } = resolvePeriodRange('month', 'no-es-una-fecha');

    expect(start.format('YYYY-MM')).toBe(moment().format('YYYY-MM'));
  });
});

describe('shiftAnchor', () => {
  it('mueve el ancla hacia atrás y hacia adelante', () => {
    expect(shiftAnchor('month', '2026-09-17', -1)).toBe('2026-08-01');
    expect(shiftAnchor('month', '2026-09-17', 1)).toBe('2026-10-01');
  });

  it('cruza el año al moverse por trimestres', () => {
    expect(shiftAnchor('quarter', '2026-11-05', 1)).toBe('2027-01-01');
  });
});

describe('isLastNavigablePeriod', () => {
  it('el período que contiene a hoy es el último navegable', () => {
    expect(isLastNavigablePeriod('month', moment().format('YYYY-MM-DD'))).toBe(true);
  });

  it('un período pasado todavía tiene siguiente', () => {
    expect(isLastNavigablePeriod('month', moment().subtract(2, 'month').format('YYYY-MM-DD'))).toBe(false);
  });
});

describe('formatPeriodLabelShort', () => {
  it('usa el mes abreviado sin el punto del locale español', () => {
    expect(formatPeriodLabelShort('month', '2026-09-17')).toBe('Sep 2026');
  });

  it('el día sale en formato DD/MM/YYYY y el año sólo con el número', () => {
    expect(formatPeriodLabelShort('day', '2026-09-17')).toBe('17/09/2026');
    expect(formatPeriodLabelShort('year', '2026-09-17')).toBe('2026');
  });

  it('el trimestre sale como TQ YYYY', () => {
    expect(formatPeriodLabelShort('quarter', '2026-09-17')).toBe('T3 2026');
  });
});

describe('formatPeriodLabel', () => {
  it('capitaliza la etiqueta larga del mes', () => {
    expect(formatPeriodLabel('month', '2026-09-17')).toBe('Septiembre 2026');
  });

  it('el trimestre agrega el rango de meses', () => {
    expect(formatPeriodLabel('quarter', '2026-09-17')).toBe('T3 2026 · Jul–Sep');
  });
});
