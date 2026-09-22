import { describe, expect, it } from 'vitest';
import { findCloneConflicts, formatUtcTime, type DuplicatedRow } from './clone-conflicts';

function row(overrides: Partial<DuplicatedRow> & Pick<DuplicatedRow, 'id'>): DuplicatedRow {
  return {
    cloned_from_row_id: 'origen-1',
    daily_report_id: 'parte-1',
    customerName: 'Cliente A',
    serviceName: 'Servicio A',
    itemName: 'Item A',
    sectorName: null,
    areaName: null,
    workingDay: 'diurna',
    startTime: '08:00',
    endTime: '16:00',
    description: null,
    typeService: 'mensual',
    clonedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const reportIdToDate = new Map([
  ['parte-1', '2026-09-10'],
  ['parte-2', '2026-09-11'],
]);

describe('findCloneConflicts', () => {
  it('devuelve vacío cuando no hay filas duplicadas', () => {
    expect(findCloneConflicts([], reportIdToDate)).toEqual({ conflicts: {}, totalCount: 0, skipMap: {} });
  });

  it('agrupa los conflictos por fecha destino', () => {
    const result = findCloneConflicts(
      [row({ id: 'a' }), row({ id: 'b', daily_report_id: 'parte-2', cloned_from_row_id: 'origen-2' })],
      reportIdToDate
    );

    expect(Object.keys(result.conflicts).sort()).toEqual(['2026-09-10', '2026-09-11']);
    expect(result.conflicts['2026-09-10'].map((c) => c.id)).toEqual(['a']);
    expect(result.totalCount).toBe(2);
  });

  it('arma el skipMap con los ids de origen, sin repetirlos', () => {
    const result = findCloneConflicts(
      [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c', cloned_from_row_id: 'origen-2' })],
      reportIdToDate
    );

    expect(result.skipMap['2026-09-10']).toEqual(['origen-1', 'origen-2']);
    expect(result.totalCount).toBe(3);
  });

  it('descarta filas cuyo parte destino no está en el map de fechas', () => {
    const result = findCloneConflicts([row({ id: 'a', daily_report_id: 'parte-desconocido' })], reportIdToDate);
    expect(result).toEqual({ conflicts: {}, totalCount: 0, skipMap: {} });
  });

  it('descarta filas sin cloned_from_row_id', () => {
    const result = findCloneConflicts([row({ id: 'a', cloned_from_row_id: null })], reportIdToDate);
    expect(result).toEqual({ conflicts: {}, totalCount: 0, skipMap: {} });
  });

  it('descarta filas sin daily_report_id', () => {
    const result = findCloneConflicts([row({ id: 'a', daily_report_id: null })], reportIdToDate);
    expect(result).toEqual({ conflicts: {}, totalCount: 0, skipMap: {} });
  });
});

describe('formatUtcTime', () => {
  it('devuelve null cuando no hay hora', () => {
    expect(formatUtcTime(null)).toBeNull();
  });

  it('formatea HH:mm en UTC con ceros a la izquierda', () => {
    expect(formatUtcTime(new Date(Date.UTC(1970, 0, 1, 8, 5)))).toBe('08:05');
  });

  it('no corre la hora por la zona horaria local', () => {
    expect(formatUtcTime(new Date(Date.UTC(1970, 0, 1, 23, 30)))).toBe('23:30');
  });
});
