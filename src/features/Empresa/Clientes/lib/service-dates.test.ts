import { describe, expect, it } from 'vitest';
import { dbDateToLocal, getContractStatus, isContractInForce, localDateToDb, toIsoDate } from './service-dates';

const today = new Date(2026, 8, 22); // 22/09/2026 local

describe('isContractInForce', () => {
  it('vigente cuando hoy está dentro de [inicio, validez]', () => {
    expect(isContractInForce({ service_start: '2026-01-01', service_validity: '2026-12-31' }, today)).toBe(true);
  });

  it('vigente el mismo día de inicio y el mismo día de vencimiento', () => {
    expect(isContractInForce({ service_start: '2026-09-22', service_validity: '2026-12-31' }, today)).toBe(true);
    expect(isContractInForce({ service_start: '2026-01-01', service_validity: '2026-09-22' }, today)).toBe(true);
  });

  it('vencido cuando la validez es anterior a hoy', () => {
    expect(isContractInForce({ service_start: '2025-01-01', service_validity: '2026-09-21' }, today)).toBe(false);
  });

  it('no vigente cuando todavía no empezó', () => {
    expect(isContractInForce({ service_start: '2026-10-01', service_validity: '2027-01-01' }, today)).toBe(false);
  });

  it('acepta Date además de string', () => {
    expect(
      isContractInForce({ service_start: new Date(2026, 0, 1), service_validity: new Date(2026, 11, 31) }, today)
    ).toBe(true);
  });

  it('sin validez → vigente si ya empezó (contrato abierto)', () => {
    expect(isContractInForce({ service_start: '2026-01-01', service_validity: null }, today)).toBe(true);
  });
});

describe('getContractStatus', () => {
  it('inactivo manda sobre las fechas', () => {
    expect(
      getContractStatus({ is_active: false, service_start: '2026-01-01', service_validity: '2026-12-31' }, today)
    ).toBe('inactivo');
  });

  it('activo y en fecha → vigente; activo pero fuera de fecha → vencido', () => {
    expect(
      getContractStatus({ is_active: true, service_start: '2026-01-01', service_validity: '2026-12-31' }, today)
    ).toBe('vigente');
    expect(
      getContractStatus({ is_active: true, service_start: '2025-01-01', service_validity: '2026-09-01' }, today)
    ).toBe('vencido');
  });

  it('is_active null se trata como activo', () => {
    expect(
      getContractStatus({ is_active: null, service_start: '2026-01-01', service_validity: '2026-12-31' }, today)
    ).toBe('vigente');
  });
});

describe('toIsoDate', () => {
  it('Date → YYYY-MM-DD en hora local', () => {
    expect(toIsoDate(new Date(2026, 8, 5))).toBe('2026-09-05');
  });

  it('string ISO se recorta a la fecha', () => {
    expect(toIsoDate('2026-09-05T03:00:00.000Z')).toBe('2026-09-05');
  });

  it('null/undefined → null', () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
  });
});

describe('dbDateToLocal / localDateToDb', () => {
  it('un date de la base (medianoche UTC) se muestra el mismo día en hora local', () => {
    const fromDb = new Date(Date.UTC(2026, 8, 5));
    const local = dbDateToLocal(fromDb);
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 8, 5]);
  });

  it('un día elegido en el calendario viaja como medianoche UTC de ese mismo día', () => {
    const picked = new Date(2026, 8, 5, 23, 30);
    const db = localDateToDb(picked);
    expect(db.toISOString()).toBe('2026-09-05T00:00:00.000Z');
  });

  it('ida y vuelta conserva el día', () => {
    const picked = new Date(2026, 0, 31);
    expect(toIsoDate(dbDateToLocal(localDateToDb(picked)))).toBe('2026-01-31');
  });
});
