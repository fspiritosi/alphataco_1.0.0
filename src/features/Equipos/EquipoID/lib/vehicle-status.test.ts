import { describe, expect, it } from 'vitest';
import {
  HEADER_CONDITION_TRANSITIONS,
  buildVehicleStatusUpdate,
  canChangeConditionFromHeader,
  toEquipmentTerminationReason,
} from './vehicle-status';

describe('toEquipmentTerminationReason', () => {
  it('mapea las etiquetas de la UI al enum de Prisma', () => {
    expect(toEquipmentTerminationReason('venta')).toBe('venta');
    expect(toEquipmentTerminationReason('destrucción total')).toBe('destrucci_n_total');
    expect(toEquipmentTerminationReason('devolución')).toBe('devoluci_n');
    expect(toEquipmentTerminationReason('otro')).toBe('otro');
  });

  it('es idempotente con los valores del enum', () => {
    expect(toEquipmentTerminationReason('destrucci_n_total')).toBe('destrucci_n_total');
    expect(toEquipmentTerminationReason('devoluci_n')).toBe('devoluci_n');
  });

  it('lanza con un motivo desconocido o vacio', () => {
    expect(() => toEquipmentTerminationReason('robo')).toThrow('Motivo de baja inválido');
    expect(() => toEquipmentTerminationReason('')).toThrow('Motivo de baja inválido');
  });
});

describe('buildVehicleStatusUpdate', () => {
  it('reintegro: activa, conserva la condición indicada y limpia motivo y fecha de baja', () => {
    expect(buildVehicleStatusUpdate({ activate: true, condition: 'en_preparacion' })).toEqual({
      is_active: true,
      condition: 'en_preparacion',
      reason_for_termination: null,
      termination_date: null,
    });
  });

  it('baja: desactiva con motivo mapeado y fecha como día UTC (columna DATE)', () => {
    const result = buildVehicleStatusUpdate({
      activate: false,
      condition: 'no_operativo',
      reason: 'destrucción total',
      terminationDate: new Date(2026, 8, 15, 23, 30), // local 15/09 23:30 → sigue siendo 15/09
    });
    expect(result).toEqual({
      is_active: false,
      condition: 'no_operativo',
      reason_for_termination: 'destrucci_n_total',
      termination_date: new Date('2026-09-15T00:00:00.000Z'),
    });
  });

  it('baja: acepta la fecha como YYYY-MM-DD', () => {
    const result = buildVehicleStatusUpdate({
      activate: false,
      condition: 'no_operativo',
      reason: 'venta',
      terminationDate: '2026-01-31',
    });
    expect(result.termination_date).toEqual(new Date('2026-01-31T00:00:00.000Z'));
  });

  it('baja: sin motivo o sin fecha lanza (no se persiste una baja incompleta)', () => {
    expect(() =>
      buildVehicleStatusUpdate({ activate: false, condition: 'no_operativo', reason: '', terminationDate: '2026-01-31' })
    ).toThrow('Motivo de baja inválido');
    expect(() =>
      buildVehicleStatusUpdate({ activate: false, condition: 'no_operativo', reason: 'venta', terminationDate: undefined })
    ).toThrow('La fecha de baja es requerida');
  });

  it('acepta la condición con espacios (valor legacy de la UI) y la normaliza al enum', () => {
    expect(buildVehicleStatusUpdate({ activate: false, condition: 'no operativo', reason: 'otro', terminationDate: '2026-02-02' }).condition).toBe(
      'no_operativo'
    );
    expect(() => buildVehicleStatusUpdate({ activate: true, condition: 'volando' })).toThrow('Condición inválida');
  });
});

describe('canChangeConditionFromHeader', () => {
  it('desde el header sólo se pasa de "en preparación" a "operativo"', () => {
    expect(canChangeConditionFromHeader('en_preparacion', 'operativo')).toBe(true);
    expect(canChangeConditionFromHeader('operativo', 'en_preparacion')).toBe(false);
    expect(canChangeConditionFromHeader('no_operativo', 'operativo')).toBe(false);
    expect(canChangeConditionFromHeader(null, 'operativo')).toBe(false);
    expect(HEADER_CONDITION_TRANSITIONS).toEqual([{ from: 'en_preparacion', to: 'operativo' }]);
  });
});
