import { describe, expect, it } from 'vitest';
import { companyReceiverConditionId, expectedSupplierLetter, supplierEmitterCondition } from './invoice-letter';

const expected = (supplierVatConditionId: number, companyTaxCondition: Parameters<typeof expectedSupplierLetter>[0]['companyTaxCondition']) =>
  expectedSupplierLetter({ supplierVatConditionId, supplierName: 'Repuestos del Sur', companyTaxCondition });

describe('letra que tiene que emitir el proveedor', () => {
  it('condicion del proveedor como emisor', () => {
    expect(supplierEmitterCondition(1)).toBe('responsable_inscripto');
    expect(supplierEmitterCondition(6)).toBe('monotributo');
    expect(supplierEmitterCondition(13)).toBe('monotributo');
    expect(supplierEmitterCondition(16)).toBe('monotributo');
    expect(supplierEmitterCondition(4)).toBe('exento');
    expect(supplierEmitterCondition(5)).toBeNull();
  });

  it('condicion de la empresa como receptora', () => {
    expect(companyReceiverConditionId('responsable_inscripto')).toBe(1);
    expect(companyReceiverConditionId('monotributo')).toBe(6);
    expect(companyReceiverConditionId('exento')).toBe(4);
  });

  it('RI a RI → A', () => {
    const result = expected(1, 'responsable_inscripto');
    expect(result).toMatchObject({ ok: true, letter: 'A' });
  });

  it('RI a una empresa monotributista → A (RG 5003)', () => {
    expect(expected(1, 'monotributo')).toMatchObject({ ok: true, letter: 'A' });
  });

  it('RI a una empresa exenta → B', () => {
    expect(expected(1, 'exento')).toMatchObject({ ok: true, letter: 'B' });
  });

  it('monotributista o exento → C', () => {
    expect(expected(6, 'responsable_inscripto')).toMatchObject({ ok: true, letter: 'C' });
    expect(expected(4, 'responsable_inscripto')).toMatchObject({ ok: true, letter: 'C' });
  });

  it('el motivo nombra al proveedor', () => {
    const result = expected(1, 'responsable_inscripto');
    expect(result.ok && result.reason).toBe('Repuestos del Sur es IVA Responsable Inscripto: se espera Factura A.');
  });

  it('condicion del proveedor que no emite A, B ni C (consumidor final) → no se controla', () => {
    const result = expected(5, 'responsable_inscripto');
    expect(result).toEqual({
      ok: false,
      error: 'No se pudo controlar la letra: Repuestos del Sur figura como Consumidor Final.',
    });
  });

  it('empresa sin datos fiscales → no se controla', () => {
    const result = expected(1, null);
    expect(result).toEqual({
      ok: false,
      error: 'No se pudo controlar la letra: faltan los datos fiscales de la empresa (Configuración → Datos fiscales).',
    });
  });
});
