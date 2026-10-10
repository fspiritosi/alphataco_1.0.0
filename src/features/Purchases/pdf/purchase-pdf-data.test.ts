import { describe, expect, it } from 'vitest';
import { buildOrderPdfData, buildQuotePdfData, type PurchasePdfSource } from './purchase-pdf-data';

const base: PurchasePdfSource = {
  number: 'OC-000007',
  date: '2026-10-08',
  company: { name: 'Grupo Horizonte SRL', cuit: '30712345678', address: 'Ruta 7 km 3', city: 'Neuquén', province: 'Neuquén' },
  supplier: { name: 'Repuestos del Sur SRL', cuit: '20123456786', vatConditionId: 1, street: null, city: null, province: null },
  lines: [
    { code: 'AC-15', name: 'Aceite 15W40', description: null, quantity: '200', unitAbbr: 'l', unitPrice: '1234.5', vatRateId: 5, netTotal: '246900.00', vatAmount: '51849.00' },
    { code: null, name: null, description: 'Rectificado de tapa', quantity: '1', unitAbbr: 'u', unitPrice: '50000', vatRateId: 4, netTotal: '50000.00', vatAmount: '5250.00' },
  ],
  totals: { subtotal: '296900.00', vatTotal: '57099.00', total: '353999.00' },
  deliveryDate: '2026-10-20',
  deliveryPlace: 'Base Neuquén',
  paymentTermDays: 30,
  notes: null,
  status: 'DRAFT',
  approvedAt: null,
};

describe('datos del PDF de compras', () => {
  it('OC en borrador lleva marca de agua; aprobada no', () => {
    expect(buildOrderPdfData(base).watermark).toBe('BORRADOR — NO VÁLIDA');
    expect(buildOrderPdfData({ ...base, status: 'APPROVED', approvedAt: '2026-10-08T10:00:00Z' }).watermark).toBeNull();
  });

  it('lineas de material y de texto libre', () => {
    const data = buildOrderPdfData(base);
    expect(data.lines[0].item).toBe('[AC-15] Aceite 15W40');
    expect(data.lines[0].quantity).toBe('200 l');
    expect(data.lines[0].unitPrice).toBe('$ 1.234,50');
    expect(data.lines[0].vatRate).toBe('21%');
    expect(data.lines[1].item).toBe('Rectificado de tapa');
    expect(data.lines[1].vatRate).toBe('10,5%');
  });

  it('totales, fechas, condiciones y CUIT en formato argentino', () => {
    const data = buildOrderPdfData(base);
    expect(data.totals).toEqual({ subtotal: '$ 296.900,00', vatTotal: '$ 57.099,00', total: '$ 353.999,00' });
    expect(data.date).toBe('08/10/2026');
    expect(data.company.cuit).toBe('30-71234567-8');
    expect(data.supplier.vatCondition).toBe('IVA Responsable Inscripto');
    expect(data.conditions).toEqual([
      { label: 'Fecha de entrega', value: '20/10/2026' },
      { label: 'Lugar de entrega', value: 'Base Neuquén' },
      { label: 'Plazo de pago', value: '30 días' },
    ]);
  });

  it('proveedor sin direccion no imprime una linea vacia', () => {
    expect(buildOrderPdfData(base).supplier.address).toBeNull();
    expect(buildOrderPdfData({ ...base, supplier: { ...base.supplier, street: 'San Martín 100', city: 'Cipolletti', province: null } }).supplier.address).toBe(
      'San Martín 100, Cipolletti'
    );
  });

  it('el pedido de cotizacion no lleva precios ni marca de agua', () => {
    const data = buildQuotePdfData({ ...base, number: 'PC-000003' });
    expect(data.title).toBe('PEDIDO DE COTIZACIÓN');
    expect(data.watermark).toBeNull();
    expect(data.lines[0]).toEqual({ position: '1', item: '[AC-15] Aceite 15W40', quantity: '200 l' });
  });
});
