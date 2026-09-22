import { describe, expect, it } from 'vitest';
import { dbDateToLocal, localDateToDb } from './service-dates';

describe('dbDateToLocal / localDateToDb', () => {
  it('un date de la base (medianoche UTC) se muestra el mismo día en hora local', () => {
    const local = dbDateToLocal(new Date(Date.UTC(2026, 8, 5)));
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 8, 5]);
  });

  it('un día elegido en el calendario viaja como medianoche UTC de ese mismo día', () => {
    expect(localDateToDb(new Date(2026, 8, 5, 23, 30)).toISOString()).toBe('2026-09-05T00:00:00.000Z');
  });

  it('ida y vuelta conserva el día (incluido fin de mes)', () => {
    const picked = new Date(2026, 0, 31);
    const back = dbDateToLocal(localDateToDb(picked));
    expect([back.getFullYear(), back.getMonth(), back.getDate()]).toEqual([2026, 0, 31]);
  });
});
