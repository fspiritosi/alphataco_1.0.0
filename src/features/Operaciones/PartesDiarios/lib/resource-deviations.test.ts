import { describe, expect, it } from 'vitest';
import { classifyEmployeeDeviation, classifyEquipmentDeviation } from './resource-deviations';

describe('classifyEmployeeDeviation', () => {
  it('marca no_contractor cuando el empleado no está afectado al cliente', () => {
    expect(classifyEmployeeDeviation({ hasContractor: false, diagramForDay: true, isWorkDay: true })).toBe(
      'no_contractor'
    );
  });

  it('prioriza la falta de afectación sobre la falta de diagrama', () => {
    expect(classifyEmployeeDeviation({ hasContractor: false, diagramForDay: false, isWorkDay: false })).toBe(
      'no_contractor'
    );
  });

  it('marca deviation_no_diagram cuando no hay diagrama para el día', () => {
    expect(classifyEmployeeDeviation({ hasContractor: true, diagramForDay: false, isWorkDay: false })).toBe(
      'deviation_no_diagram'
    );
  });

  it('ignora isWorkDay cuando no hay diagrama', () => {
    expect(classifyEmployeeDeviation({ hasContractor: true, diagramForDay: false, isWorkDay: true })).toBe(
      'deviation_no_diagram'
    );
  });

  it('marca deviation_non_work_day cuando el diagrama existe pero el día no es laboral', () => {
    expect(classifyEmployeeDeviation({ hasContractor: true, diagramForDay: true, isWorkDay: false })).toBe(
      'deviation_non_work_day'
    );
  });

  it('devuelve ok cuando está afectado y el día es laboral', () => {
    expect(classifyEmployeeDeviation({ hasContractor: true, diagramForDay: true, isWorkDay: true })).toBe('ok');
  });
});

describe('classifyEquipmentDeviation', () => {
  it('marca no_contractor cuando el equipo no está afectado al cliente', () => {
    expect(classifyEquipmentDeviation({ hasContractor: false, condition: 'operativo' })).toBe('no_contractor');
  });

  it('prioriza la falta de afectación sobre la condición', () => {
    expect(classifyEquipmentDeviation({ hasContractor: false, condition: 'no_operativo' })).toBe('no_contractor');
  });

  it('marca deviation_non_operative cuando la condición no es operativo', () => {
    expect(classifyEquipmentDeviation({ hasContractor: true, condition: 'en_reparacion' })).toBe(
      'deviation_non_operative'
    );
  });

  it('trata la condición desconocida (null) como operativa', () => {
    expect(classifyEquipmentDeviation({ hasContractor: true, condition: null })).toBe('ok');
  });

  it('devuelve ok cuando está afectado y operativo', () => {
    expect(classifyEquipmentDeviation({ hasContractor: true, condition: 'operativo' })).toBe('ok');
  });
});
