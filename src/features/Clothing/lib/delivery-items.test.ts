import { describe, expect, it } from 'vitest';
import { isDeliveryType, normalizeDeliveryItems, type RawDeliveryItem } from './delivery-items';

describe('isDeliveryType', () => {
  it('acepta los tres tipos del enum', () => {
    expect(isDeliveryType('PLANNED_CCT')).toBe(true);
    expect(isDeliveryType('PLANNED_EPP')).toBe(true);
    expect(isDeliveryType('REPLACEMENT')).toBe(true);
  });

  it('rechaza cualquier otro string', () => {
    expect(isDeliveryType('')).toBe(false);
    expect(isDeliveryType('planned_cct')).toBe(false);
    expect(isDeliveryType('DROP TABLE')).toBe(false);
  });
});

describe('normalizeDeliveryItems', () => {
  const base: RawDeliveryItem = { clothingItemId: 'item-1', quantity: 1 };

  it('descarta la fila vacía con la que arranca el asistente', () => {
    expect(normalizeDeliveryItems([{ clothingItemId: '', quantity: 1 }])).toEqual([]);
    expect(normalizeDeliveryItems([{ clothingItemId: '   ', quantity: 2 }])).toEqual([]);
  });

  it('descarta cantidades no positivas o fraccionarias', () => {
    const items: RawDeliveryItem[] = [
      { ...base, quantity: 0 },
      { ...base, quantity: -3 },
      { ...base, quantity: 1.5 },
    ];

    expect(normalizeDeliveryItems(items)).toEqual([]);
  });

  it('normaliza marca y talle vacíos a null y el certificado ausente a false', () => {
    const items: RawDeliveryItem[] = [{ clothingItemId: 'item-1', clothingBrandId: '', quantity: 2 }];

    expect(normalizeDeliveryItems(items)).toEqual([
      { clothingItemId: 'item-1', clothingBrandId: null, clothingSizeId: null, quantity: 2, hasCertificate: false },
    ]);
  });

  it('suma las filas repetidas del mismo artículo, marca y talle', () => {
    const items: RawDeliveryItem[] = [
      { clothingItemId: 'item-1', clothingBrandId: 'b1', clothingSizeId: 's1', quantity: 2 },
      { clothingItemId: 'item-1', clothingBrandId: 'b1', clothingSizeId: 's1', quantity: 3, hasCertificate: true },
    ];

    expect(normalizeDeliveryItems(items)).toEqual([
      { clothingItemId: 'item-1', clothingBrandId: 'b1', clothingSizeId: 's1', quantity: 5, hasCertificate: true },
    ]);
  });

  it('no mezcla el mismo artículo con marcas o talles distintos', () => {
    const items: RawDeliveryItem[] = [
      { clothingItemId: 'item-1', clothingBrandId: 'b1', clothingSizeId: 's1', quantity: 1 },
      { clothingItemId: 'item-1', clothingBrandId: 'b1', clothingSizeId: 's2', quantity: 1 },
      { clothingItemId: 'item-1', clothingBrandId: 'b2', clothingSizeId: 's1', quantity: 1 },
    ];

    expect(normalizeDeliveryItems(items)).toHaveLength(3);
  });

  it('conserva el orden de aparición', () => {
    const items: RawDeliveryItem[] = [
      { clothingItemId: 'item-2', quantity: 1 },
      { clothingItemId: 'item-1', quantity: 1 },
    ];

    expect(normalizeDeliveryItems(items).map((item) => item.clothingItemId)).toEqual(['item-2', 'item-1']);
  });
});
