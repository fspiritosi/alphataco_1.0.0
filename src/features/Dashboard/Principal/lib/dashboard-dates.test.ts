import { describe, expect, it } from 'vitest';
import {
  buildTodayReportWhere,
  getOperationToday,
  getStartOfOperationMonth,
  getTodayParts,
} from './dashboard-dates';

describe('getOperationToday', () => {
  it('usa la fecha de la operación (UTC-3), no la del servidor', () => {
    // 2026-09-24T01:30Z todavía es 23/09 en Argentina.
    expect(getOperationToday(new Date('2026-09-24T01:30:00Z'))).toBe('2026-09-23');
  });

  it('cambia de día recién a las 03:00 UTC', () => {
    expect(getOperationToday(new Date('2026-09-24T02:59:59Z'))).toBe('2026-09-23');
    expect(getOperationToday(new Date('2026-09-24T03:00:00Z'))).toBe('2026-09-24');
  });
});

describe('getTodayParts', () => {
  it('parte la fecha de la operación en día, mes y año', () => {
    expect(getTodayParts(new Date('2026-09-24T01:30:00Z'))).toEqual({ day: 23, month: 9, year: 2026 });
  });

  it('el mes viene en base 1', () => {
    expect(getTodayParts(new Date('2026-01-15T12:00:00Z')).month).toBe(1);
  });
});

describe('getStartOfOperationMonth', () => {
  it('recorta al primer día del mes de la operación', () => {
    const start = getStartOfOperationMonth(new Date('2026-09-24T01:30:00Z'));
    expect(getOperationToday(start)).toBe('2026-09-01');
  });

  it('un 1 de mes a la madrugada UTC cae en el mes anterior', () => {
    const start = getStartOfOperationMonth(new Date('2026-10-01T01:00:00Z'));
    expect(getOperationToday(start)).toBe('2026-09-01');
  });
});

describe('buildTodayReportWhere', () => {
  it('acota el parte a la empresa y a la fecha de la operación', () => {
    const where = buildTodayReportWhere('company-1', undefined, new Date('2026-09-23T15:00:00Z'));

    expect(where.dailyreport.company_id).toBe('company-1');
    expect(where.dailyreport.is_active).toBe(true);
    expect(where.dailyreport.date).toEqual(new Date('2026-09-23'));
  });

  it('respeta la fecha explícita cuando la recibe', () => {
    const where = buildTodayReportWhere('company-1', '2026-01-05', new Date('2026-09-23T15:00:00Z'));

    expect(where.dailyreport.date).toEqual(new Date('2026-01-05'));
  });
});
