import { describe, expect, it } from 'vitest';
import { normalizePeriod, planDocumentWrites, type ExistingDocumentRow } from './plan-writes';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function row(partial: Partial<ExistingDocumentRow> & { applies: string }): ExistingDocumentRow {
  return { state: 'pendiente', document_path: null, period: null, archived_at: null, ...partial };
}

describe('normalizePeriod', () => {
  it('permanentes (sin período) → null; mensuales → el período tal cual', () => {
    expect(normalizePeriod(undefined)).toBeNull();
    expect(normalizePeriod('')).toBeNull();
    expect(normalizePeriod('2026-03')).toBe('2026-03');
  });
});

describe('planDocumentWrites', () => {
  it('sin fila para el recurso → create', () => {
    expect(planDocumentWrites([], [A], undefined)).toEqual({ toUpdate: [], toCreate: [A], alreadyUploaded: [] });
  });

  it('mismo período ya presentado con archivo → alreadyUploaded (no se pisa)', () => {
    const existing = [row({ applies: A, state: 'presentado', document_path: 'x/y.pdf', period: '2026-03' })];
    expect(planDocumentWrites(existing, [A], '2026-03')).toEqual({ toUpdate: [], toCreate: [], alreadyUploaded: [A] });
  });

  it('mismo período aprobado con archivo → alreadyUploaded', () => {
    const existing = [row({ applies: A, state: 'aprobado', document_path: 'x/y.pdf', period: null })];
    expect(planDocumentWrites(existing, [A], undefined)).toEqual({ toUpdate: [], toCreate: [], alreadyUploaded: [A] });
  });

  it('distinto período (mensual ya presentado en otro mes) → create: varias filas por recurso+tipo', () => {
    const existing = [row({ applies: A, state: 'presentado', document_path: 'x/y.pdf', period: '2026-02' })];
    expect(planDocumentWrites(existing, [A], '2026-03')).toEqual({ toUpdate: [], toCreate: [A], alreadyUploaded: [] });
  });

  it('pendiente (alerta sin archivo) del mismo período → update', () => {
    const existing = [row({ applies: A, state: 'pendiente', period: null })];
    expect(planDocumentWrites(existing, [A], undefined)).toEqual({ toUpdate: [A], toCreate: [], alreadyUploaded: [] });
  });

  it('rechazado o vencido con archivo del mismo período → update (se reemplaza)', () => {
    const existing = [
      row({ applies: A, state: 'rechazado', document_path: 'x/a.pdf', period: '2026-03' }),
      row({ applies: B, state: 'vencido', document_path: 'x/b.pdf', period: '2026-03' }),
    ];
    expect(planDocumentWrites(existing, [A, B], '2026-03')).toEqual({ toUpdate: [A, B], toCreate: [], alreadyUploaded: [] });
  });

  it('archivada ("ya no aplica") del mismo período → update, aunque esté presentada con archivo', () => {
    const existing = [
      row({ applies: A, state: 'presentado', document_path: 'x/y.pdf', period: null, archived_at: new Date() }),
    ];
    expect(planDocumentWrites(existing, [A], undefined)).toEqual({ toUpdate: [A], toCreate: [], alreadyUploaded: [] });
  });

  it('multi: mezcla de recursos → cada uno según su fila del período; ignora filas de otros períodos y sin applies', () => {
    const existing = [
      row({ applies: A, state: 'presentado', document_path: 'x/y.pdf', period: '2026-03' }),
      row({ applies: B, state: 'presentado', document_path: 'x/y.pdf', period: '2026-01' }),
      row({ applies: null as unknown as string, state: 'pendiente', period: '2026-03' }),
    ];
    const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    expect(planDocumentWrites(existing, [A, B, C], '2026-03')).toEqual({
      toUpdate: [],
      toCreate: [B, C],
      alreadyUploaded: [A],
    });
  });
});
