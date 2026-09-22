import { describe, expect, it } from 'vitest';
import type { DailyReportDetailRow } from '../types';
import { buildEmployeeLabel, buildRowDescription } from './helpers';

describe('buildEmployeeLabel', () => {
  it('arma el label con legajo, apellido y nombre', () => {
    expect(buildEmployeeLabel({ file: '1234', lastname: 'Perez', firstname: 'Juan' })).toBe('[1234] Perez Juan');
  });

  it('usa "?" cuando falta el legajo', () => {
    expect(buildEmployeeLabel({ file: null, lastname: 'Perez', firstname: 'Juan' })).toBe('[?] Perez Juan');
  });

  it('recorta los espacios externos cuando falta nombre o apellido (el interno entre ambos se conserva)', () => {
    expect(buildEmployeeLabel({ file: '1234', lastname: 'Perez', firstname: null })).toBe('[1234] Perez');
    expect(buildEmployeeLabel({ file: '1234', lastname: null, firstname: 'Juan' })).toBe('[1234]  Juan');
  });

  it('devuelve solo el legajo entre corchetes cuando no hay nombre ni apellido', () => {
    expect(buildEmployeeLabel({ file: '1234', lastname: null, firstname: null })).toBe('[1234]');
  });
});

describe('buildRowDescription', () => {
  function row(overrides: Partial<DailyReportDetailRow>): DailyReportDetailRow {
    return {
      customers: null,
      customer_services: null,
      service_items: null,
      ...overrides,
    } as DailyReportDetailRow;
  }

  it('junta cliente, servicio e item con separador', () => {
    const result = buildRowDescription(
      row({
        customers: { id: 'c1', name: 'Cliente A' } as DailyReportDetailRow['customers'],
        customer_services: { id: 's1', service_name: 'Servicio A' } as DailyReportDetailRow['customer_services'],
        service_items: { id: 'i1', item_name: 'Item A' } as DailyReportDetailRow['service_items'],
      })
    );
    expect(result).toBe('Cliente A · Servicio A · Item A');
  });

  it('omite las partes ausentes', () => {
    const result = buildRowDescription(
      row({
        customers: { id: 'c1', name: 'Cliente A' } as DailyReportDetailRow['customers'],
        customer_services: null,
        service_items: null,
      })
    );
    expect(result).toBe('Cliente A');
  });

  it('devuelve el mensaje genérico cuando no hay ningún dato', () => {
    const result = buildRowDescription(row({}));
    expect(result).toBe('Recursos asignados a esta fila del parte diario.');
  });
});
