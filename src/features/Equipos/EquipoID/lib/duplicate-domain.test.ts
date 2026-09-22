import { describe, expect, it } from 'vitest';
import { DUPLICATE_RACE_WINDOW_MS, pickDuplicateRaceWinner, raceWindowStart } from './duplicate-domain';

const t0 = new Date('2026-09-22T10:00:00.000Z');
const t1 = new Date('2026-09-22T10:00:00.500Z');

describe('pickDuplicateRaceWinner', () => {
  it('sin hermanos (0 o 1 fila) no hay carrera: null', () => {
    expect(pickDuplicateRaceWinner([])).toBeNull();
    expect(pickDuplicateRaceWinner([{ id: 'a', created_at: t0 }])).toBeNull();
  });

  it('gana el mas antiguo por created_at', () => {
    const winner = pickDuplicateRaceWinner([
      { id: 'nuevo', created_at: t1 },
      { id: 'viejo', created_at: t0 },
    ]);
    expect(winner?.id).toBe('viejo');
  });

  it('a igual created_at desempata por id (orden lexicografico), determinista para ambas requests', () => {
    const rows = [
      { id: 'bbbb', created_at: t0 },
      { id: 'aaaa', created_at: t0 },
    ];
    expect(pickDuplicateRaceWinner(rows)?.id).toBe('aaaa');
    expect(pickDuplicateRaceWinner([...rows].reverse())?.id).toBe('aaaa');
  });

  it('acepta created_at como string ISO (shape legacy) y como Date', () => {
    const winner = pickDuplicateRaceWinner([
      { id: 'x', created_at: '2026-09-22T10:00:00.900Z' },
      { id: 'y', created_at: t0 },
    ]);
    expect(winner?.id).toBe('y');
  });

  it('no muta el array de entrada', () => {
    const rows = [
      { id: 'b', created_at: t1 },
      { id: 'a', created_at: t0 },
    ];
    pickDuplicateRaceWinner(rows);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('raceWindowStart', () => {
  it('resta la ventana de duplicados al created_at del registro', () => {
    expect(raceWindowStart(t0).getTime()).toBe(t0.getTime() - DUPLICATE_RACE_WINDOW_MS);
    expect(raceWindowStart('2026-09-22T10:00:00.000Z').getTime()).toBe(t0.getTime() - DUPLICATE_RACE_WINDOW_MS);
  });
});
