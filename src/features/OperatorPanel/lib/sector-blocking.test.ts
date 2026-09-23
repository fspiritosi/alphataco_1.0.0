import { describe, expect, it } from 'vitest';
import { computeWorkOrderBlocking, type SectorSequenceItem } from './sector-blocking';

function item(overrides: Partial<SectorSequenceItem> & Pick<SectorSequenceItem, 'workOrderId' | 'sequenceOrder'>) {
  return {
    maintenanceOrderId: 'om-1',
    assignedSectorId: `sector-${overrides.sequenceOrder}`,
    sectorName: `Sector ${overrides.sequenceOrder}`,
    workOrderStatus: 'pending',
    ...overrides,
  } satisfies SectorSequenceItem;
}

describe('computeWorkOrderBlocking', () => {
  it('sin OTs pedidas devuelve un mapa vacío', () => {
    expect(computeWorkOrderBlocking([], [item({ workOrderId: 'ot-1', sequenceOrder: 1 })])).toEqual({});
  });

  it('marca como no bloqueadas las OTs sin ítems de secuencia', () => {
    expect(computeWorkOrderBlocking(['ot-1'], [])).toEqual({
      'ot-1': { isBlocked: false, blockedBySector: null },
    });
  });

  it('bloquea la OT cuando un sector anterior sigue abierto', () => {
    const result = computeWorkOrderBlocking(
      ['ot-2'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, workOrderStatus: 'in_progress' }),
        item({ workOrderId: 'ot-2', sequenceOrder: 2 }),
      ]
    );

    expect(result['ot-2']).toEqual({ isBlocked: true, blockedBySector: 'Sector 1' });
  });

  it('no bloquea cuando el sector anterior está completado', () => {
    const result = computeWorkOrderBlocking(
      ['ot-2'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, workOrderStatus: 'completed' }),
        item({ workOrderId: 'ot-2', sequenceOrder: 2 }),
      ]
    );

    expect(result['ot-2']).toEqual({ isBlocked: false, blockedBySector: null });
  });

  it('no bloquea cuando el sector anterior cerró parcial', () => {
    const result = computeWorkOrderBlocking(
      ['ot-2'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, workOrderStatus: 'completed_partial' }),
        item({ workOrderId: 'ot-2', sequenceOrder: 2 }),
      ]
    );

    expect(result['ot-2']!.isBlocked).toBe(false);
  });

  it('una OT pausada libera a los sectores siguientes (uno a la vez)', () => {
    const result = computeWorkOrderBlocking(
      ['ot-2'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, workOrderStatus: 'paused' }),
        item({ workOrderId: 'ot-2', sequenceOrder: 2 }),
      ]
    );

    expect(result['ot-2']!.isBlocked).toBe(false);
  });

  it('una OT sin estado bloquea: no se puede dar por terminada', () => {
    // `workOrderStatus: null` sale de una fila sin OT resuelta. Se trata como bloqueante a
    // propósito (preserva el `if (!wo) return true` de la versión PostgREST): ante la duda,
    // el sector siguiente espera en lugar de pisar trabajo que quizá no terminó.
    const result = computeWorkOrderBlocking(
      ['ot-2'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, workOrderStatus: null }),
        item({ workOrderId: 'ot-2', sequenceOrder: 2 }),
      ]
    );

    expect(result['ot-2']).toEqual({ isBlocked: true, blockedBySector: 'Sector 1' });
  });

  it('evalúa cada OT en su secuencia mínima', () => {
    // La OT trabaja en la secuencia 1 y en la 3: puede arrancar por la 1.
    const result = computeWorkOrderBlocking(
      ['ot-1'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, assignedSectorId: 'sector-a', sectorName: 'A' }),
        item({ workOrderId: 'ot-1', sequenceOrder: 3, assignedSectorId: 'sector-a', sectorName: 'A' }),
        item({
          workOrderId: 'ot-2',
          sequenceOrder: 2,
          assignedSectorId: 'sector-b',
          sectorName: 'B',
          workOrderStatus: 'pending',
        }),
      ]
    );

    expect(result['ot-1']!.isBlocked).toBe(false);
  });

  it('ignora los ítems del propio sector en secuencias anteriores', () => {
    const result = computeWorkOrderBlocking(
      ['ot-1'],
      [
        item({ workOrderId: 'ot-0', sequenceOrder: 1, assignedSectorId: 'sector-a', sectorName: 'A' }),
        item({ workOrderId: 'ot-1', sequenceOrder: 2, assignedSectorId: 'sector-a', sectorName: 'A' }),
      ]
    );

    expect(result['ot-1']!.isBlocked).toBe(false);
  });

  it('informa el sector bloqueante más atrasado, no el primero que devuelve la base', () => {
    const result = computeWorkOrderBlocking(
      ['ot-3'],
      [
        item({ workOrderId: 'ot-2', sequenceOrder: 2, assignedSectorId: 'sector-b', sectorName: 'Pintura' }),
        item({ workOrderId: 'ot-1', sequenceOrder: 1, assignedSectorId: 'sector-a', sectorName: 'Chapa' }),
        item({ workOrderId: 'ot-3', sequenceOrder: 3, assignedSectorId: 'sector-c', sectorName: 'Terminación' }),
      ]
    );

    expect(result['ot-3']).toEqual({ isBlocked: true, blockedBySector: 'Chapa' });
  });

  it('no mezcla pedidos distintos', () => {
    const result = computeWorkOrderBlocking(
      ['ot-2'],
      [
        item({ maintenanceOrderId: 'om-otra', workOrderId: 'ot-1', sequenceOrder: 1, workOrderStatus: 'pending' }),
        item({ maintenanceOrderId: 'om-1', workOrderId: 'ot-2', sequenceOrder: 2 }),
      ]
    );

    expect(result['ot-2']!.isBlocked).toBe(false);
  });

  it('resuelve varias OTs del mismo pedido en una sola pasada', () => {
    const result = computeWorkOrderBlocking(
      ['ot-1', 'ot-2', 'ot-3'],
      [
        item({ workOrderId: 'ot-1', sequenceOrder: 1, assignedSectorId: 'a', sectorName: 'A' }),
        item({ workOrderId: 'ot-2', sequenceOrder: 2, assignedSectorId: 'b', sectorName: 'B' }),
        item({ workOrderId: 'ot-3', sequenceOrder: 3, assignedSectorId: 'c', sectorName: 'C' }),
      ]
    );

    expect(result).toEqual({
      'ot-1': { isBlocked: false, blockedBySector: null },
      'ot-2': { isBlocked: true, blockedBySector: 'A' },
      'ot-3': { isBlocked: true, blockedBySector: 'A' },
    });
  });
});
