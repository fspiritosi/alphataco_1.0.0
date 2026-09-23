import { describe, expect, it } from 'vitest';
import { buildReceiptRows, formatCuit, RECEIPT_TOTAL_ROWS, type ReceiptItemSource } from './receipt-format';

describe('formatCuit', () => {
  it('formatea un CUIT de 11 dígitos con guiones', () => {
    expect(formatCuit('30709694363')).toBe('30-70969436-3');
  });

  it('ignora los separadores que ya traiga', () => {
    expect(formatCuit('30-70969436-3')).toBe('30-70969436-3');
    expect(formatCuit('30.70969436.3')).toBe('30-70969436-3');
  });

  it('devuelve el valor original si no tiene 11 dígitos', () => {
    expect(formatCuit('123')).toBe('123');
    expect(formatCuit('')).toBe('');
  });
});

describe('buildReceiptRows', () => {
  const item: ReceiptItemSource = {
    quantity: 2,
    has_certificate: true,
    clothing_items: { name: 'Camisa', code: 'C-1', description: 'Manga larga' },
    clothing_brands: { name: 'Marca' },
    clothing_sizes: { name: 'L' },
  };

  it('devuelve siempre la cantidad fija de filas', () => {
    expect(buildReceiptRows([item])).toHaveLength(RECEIPT_TOTAL_ROWS);
    expect(buildReceiptRows([])).toHaveLength(RECEIPT_TOTAL_ROWS);
  });

  it('deja en null las filas sobrantes', () => {
    const rows = buildReceiptRows([item]);

    expect(rows[0]).not.toBeNull();
    expect(rows.slice(1).every((row) => row === null)).toBe(true);
  });

  it('mapea el artículo a las columnas del formulario', () => {
    expect(buildReceiptRows([item])[0]).toEqual({
      producto: 'Camisa',
      tipoModelo: 'Manga larga',
      talle: 'L',
      codigo: 'C-1',
      marca: 'Marca',
      cantidad: 2,
      hasCertificate: true,
    });
  });

  it('reemplaza por cadena vacía los datos ausentes y toma el certificado como false', () => {
    const rows = buildReceiptRows([{ quantity: 1 }]);

    expect(rows[0]).toEqual({
      producto: '',
      tipoModelo: '',
      talle: '',
      codigo: '',
      marca: '',
      cantidad: 1,
      hasCertificate: false,
    });
  });

  it('descarta los artículos que no entran en la hoja', () => {
    const items = Array.from({ length: RECEIPT_TOTAL_ROWS + 3 }, () => item);

    expect(buildReceiptRows(items).filter((row) => row !== null)).toHaveLength(RECEIPT_TOTAL_ROWS);
  });
});
