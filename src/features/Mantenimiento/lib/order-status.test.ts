import { describe, expect, it } from 'vitest';
import {
  MAINTENANCE_ORDER_STATUSES,
  WORK_ORDER_CLOSED_STATUSES,
  areAllWorkOrdersClosed,
  isMaintenanceOrderStatus,
  isValidMaintenanceOrderTransition,
  isWorkOrderClosed,
  nextMaintenanceOrderStatuses,
  resolveResourceConditionAfterClose,
  resolveWorkshopRejectionStatus,
} from './order-status';

describe('MAINTENANCE_ORDER_STATUSES', () => {
  it('cubre los estados del circuito', () => {
    expect([...MAINTENANCE_ORDER_STATUSES]).toEqual([
      'pending_scheduling',
      'date_confirmed',
      'scheduled',
      'in_workshop',
      'pending_workshop_validation',
      'pending_operations_validation',
      'operations_rejected',
      'workshop_rejected',
      'rejected',
      'completed',
    ]);
  });

  it('isMaintenanceOrderStatus discrimina', () => {
    expect(isMaintenanceOrderStatus('in_workshop')).toBe(true);
    expect(isMaintenanceOrderStatus('inventado')).toBe(false);
  });
});

describe('isValidMaintenanceOrderTransition', () => {
  it('permite el camino feliz del circuito', () => {
    expect(isValidMaintenanceOrderTransition('pending_scheduling', 'date_confirmed')).toBe(true);
    expect(isValidMaintenanceOrderTransition('date_confirmed', 'in_workshop')).toBe(true);
    expect(isValidMaintenanceOrderTransition('in_workshop', 'pending_workshop_validation')).toBe(true);
    expect(isValidMaintenanceOrderTransition('pending_workshop_validation', 'completed')).toBe(true);
  });

  it('permite el retorno al taller desde la validación', () => {
    expect(isValidMaintenanceOrderTransition('pending_workshop_validation', 'in_workshop')).toBe(true);
  });

  it('permite el rechazo total del taller y su restauración', () => {
    expect(isValidMaintenanceOrderTransition('in_workshop', 'workshop_rejected')).toBe(true);
    expect(isValidMaintenanceOrderTransition('workshop_rejected', 'in_workshop')).toBe(true);
  });

  it('permite el rechazo de operaciones y el desacuerdo del taller', () => {
    expect(isValidMaintenanceOrderTransition('pending_operations_validation', 'operations_rejected')).toBe(true);
    expect(isValidMaintenanceOrderTransition('operations_rejected', 'in_workshop')).toBe(true);
    expect(isValidMaintenanceOrderTransition('operations_rejected', 'pending_operations_validation')).toBe(true);
  });

  it('permite devolver la programación a pendiente', () => {
    expect(isValidMaintenanceOrderTransition('scheduled', 'pending_scheduling')).toBe(true);
    expect(isValidMaintenanceOrderTransition('date_confirmed', 'pending_scheduling')).toBe(true);
  });

  it('permite rechazar un pedido que todavía no se programó, y deja rejected terminal', () => {
    expect(isValidMaintenanceOrderTransition('pending_scheduling', 'rejected')).toBe(true);
    expect(isValidMaintenanceOrderTransition('in_workshop', 'rejected')).toBe(false);
    expect(nextMaintenanceOrderStatuses('rejected')).toEqual([]);
  });

  it('deja completed como terminal', () => {
    expect(nextMaintenanceOrderStatuses('completed')).toEqual([]);
    expect(isValidMaintenanceOrderTransition('completed', 'in_workshop')).toBe(false);
  });

  it('rechaza saltarse el taller', () => {
    expect(isValidMaintenanceOrderTransition('pending_scheduling', 'completed')).toBe(false);
    expect(isValidMaintenanceOrderTransition('in_workshop', 'completed')).toBe(false);
  });

  it('rechaza estados desconocidos de cualquier lado', () => {
    expect(isValidMaintenanceOrderTransition('inventado', 'completed')).toBe(false);
    expect(isValidMaintenanceOrderTransition('in_workshop', 'inventado')).toBe(false);
  });

  it('rechaza la transición a sí mismo', () => {
    expect(isValidMaintenanceOrderTransition('in_workshop', 'in_workshop')).toBe(false);
  });
});

describe('work orders', () => {
  it('isWorkOrderClosed sólo acepta los cierres', () => {
    expect([...WORK_ORDER_CLOSED_STATUSES]).toEqual(['completed', 'completed_partial']);
    expect(isWorkOrderClosed('completed')).toBe(true);
    expect(isWorkOrderClosed('completed_partial')).toBe(true);
    expect(isWorkOrderClosed('cancelled')).toBe(false);
    expect(isWorkOrderClosed('in_progress')).toBe(false);
  });
});

describe('areAllWorkOrdersClosed', () => {
  it('es falso sin OTs (nada que cerrar)', () => {
    expect(areAllWorkOrdersClosed([])).toBe(false);
  });

  it('es verdadero cuando todas están completas o parciales', () => {
    expect(areAllWorkOrdersClosed(['completed', 'completed_partial'])).toBe(true);
  });

  it('es falso si alguna sigue abierta o fue cancelada', () => {
    expect(areAllWorkOrdersClosed(['completed', 'in_progress'])).toBe(false);
    expect(areAllWorkOrdersClosed(['completed', 'cancelled'])).toBe(false);
  });
});

describe('resolveWorkshopRejectionStatus', () => {
  it('pasa a workshop_rejected cuando todos los items regulares están rechazados', () => {
    expect(
      resolveWorkshopRejectionStatus('in_workshop', [
        { is_rejected: true, is_diagnostico: false },
        { is_rejected: true, is_diagnostico: false },
        { is_rejected: false, is_diagnostico: true },
      ])
    ).toBe('workshop_rejected');
  });

  it('restaura a in_workshop cuando reaparece un item no rechazado', () => {
    expect(
      resolveWorkshopRejectionStatus('workshop_rejected', [
        { is_rejected: false, is_diagnostico: false },
        { is_rejected: true, is_diagnostico: false },
      ])
    ).toBe('in_workshop');
  });

  it('no cambia nada si ya está en el estado correcto', () => {
    expect(resolveWorkshopRejectionStatus('workshop_rejected', [{ is_rejected: true, is_diagnostico: false }])).toBeNull();
    expect(resolveWorkshopRejectionStatus('in_workshop', [{ is_rejected: false, is_diagnostico: false }])).toBeNull();
  });

  it('ignora los items de diagnóstico: sólo diagnóstico no rechaza la orden', () => {
    expect(resolveWorkshopRejectionStatus('in_workshop', [{ is_rejected: true, is_diagnostico: true }])).toBeNull();
  });

  it('no toca una orden sin items', () => {
    expect(resolveWorkshopRejectionStatus('in_workshop', [])).toBeNull();
  });
});

describe('resolveResourceConditionAfterClose', () => {
  it('vuelve a operativo cuando no quedan órdenes en taller', () => {
    expect(resolveResourceConditionAfterClose(0)).toBe('operativo');
  });

  it('sigue no operativo si le quedan órdenes en taller', () => {
    expect(resolveResourceConditionAfterClose(2)).toBe('no_operativo');
  });
});
