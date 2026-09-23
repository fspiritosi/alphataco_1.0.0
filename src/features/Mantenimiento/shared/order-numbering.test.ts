import { describe, expect, it } from 'vitest';
import { nextMaintenanceOrderNumber, nextWorkOrderSequence } from './order-numbering';

/**
 * El valor de estas funciones está en el SQL, así que el test observa el SQL emitido: que
 * el advisory lock se tome ANTES del `MAX()` (si se invierte, la carrera vuelve), que la
 * clave del lock incluya la empresa y el tipo de secuencia, y que el `MAX()` filtre por
 * empresa. Un `$queryRaw` que devuelva el número correcto con el lock mal puesto pasaría
 * cualquier test que sólo mire el resultado.
 */
function fakeTx(rows: { next: bigint }[]) {
  const calls: { kind: 'exec' | 'query'; sql: string; params: unknown[] }[] = [];

  const record =
    (kind: 'exec' | 'query') =>
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      calls.push({ kind, sql: strings.join('?'), params });
      return Promise.resolve(kind === 'exec' ? 1 : rows);
    };

  return {
    calls,
    tx: { $executeRaw: record('exec'), $queryRaw: record('query') } as never,
  };
}

describe('nextWorkOrderSequence', () => {
  it('toma el advisory lock antes de leer el máximo', async () => {
    const { tx, calls } = fakeTx([{ next: 7n }]);

    await nextWorkOrderSequence(tx, 'empresa-1');

    expect(calls.map((call) => call.kind)).toEqual(['exec', 'query']);
    expect(calls[0]!.sql).toContain('pg_advisory_xact_lock');
    expect(calls[1]!.sql).toContain('MAX(sequence_number)');
  });

  it('usa una clave de lock propia de la empresa y del tipo de secuencia', async () => {
    const { tx, calls } = fakeTx([{ next: 1n }]);

    await nextWorkOrderSequence(tx, 'empresa-1');

    expect(calls[0]!.params).toEqual(['work_order_sequence:empresa-1']);
  });

  it('acota el máximo a la empresa', async () => {
    const { tx, calls } = fakeTx([{ next: 1n }]);

    await nextWorkOrderSequence(tx, 'empresa-1');

    expect(calls[1]!.sql).toContain('WHERE company_id =');
    expect(calls[1]!.params).toEqual(['empresa-1']);
  });

  it('devuelve el número como number, no como bigint', async () => {
    const { tx } = fakeTx([{ next: 42n }]);

    const result = await nextWorkOrderSequence(tx, 'empresa-1');

    expect(result).toBe(42);
    expect(typeof result).toBe('number');
  });

  it('arranca en 1 cuando la empresa no tiene ninguna OT', async () => {
    const { tx } = fakeTx([]);

    await expect(nextWorkOrderSequence(tx, 'empresa-1')).resolves.toBe(1);
  });
});

describe('nextMaintenanceOrderNumber', () => {
  it('toma el advisory lock antes de leer el máximo', async () => {
    const { tx, calls } = fakeTx([{ next: 3n }]);

    await nextMaintenanceOrderNumber(tx, 'empresa-1');

    expect(calls.map((call) => call.kind)).toEqual(['exec', 'query']);
    expect(calls[0]!.sql).toContain('pg_advisory_xact_lock');
  });

  it('no comparte la clave del lock con la secuencia de OTs', async () => {
    const { tx: txOrder, calls: orderCalls } = fakeTx([{ next: 1n }]);
    const { tx: txWork, calls: workCalls } = fakeTx([{ next: 1n }]);

    await nextMaintenanceOrderNumber(txOrder, 'empresa-1');
    await nextWorkOrderSequence(txWork, 'empresa-1');

    expect(orderCalls[0]!.params).not.toEqual(workCalls[0]!.params);
  });

  it('formatea con prefijo y seis dígitos', async () => {
    const { tx } = fakeTx([{ next: 3n }]);

    await expect(nextMaintenanceOrderNumber(tx, 'empresa-1')).resolves.toBe('OM-000003');
  });

  it('no trunca cuando el número supera los seis dígitos', async () => {
    const { tx } = fakeTx([{ next: 1234567n }]);

    await expect(nextMaintenanceOrderNumber(tx, 'empresa-1')).resolves.toBe('OM-1234567');
  });

  it('arranca en OM-000001 cuando la empresa no tiene ninguna orden numerada', async () => {
    const { tx } = fakeTx([]);

    await expect(nextMaintenanceOrderNumber(tx, 'empresa-1')).resolves.toBe('OM-000001');
  });

  it('ignora las órdenes sin número al calcular el máximo', async () => {
    const { tx, calls } = fakeTx([{ next: 1n }]);

    await nextMaintenanceOrderNumber(tx, 'empresa-1');

    expect(calls[1]!.sql).toContain('order_number IS NOT NULL');
    expect(calls[1]!.params).toEqual(['empresa-1']);
  });
});
