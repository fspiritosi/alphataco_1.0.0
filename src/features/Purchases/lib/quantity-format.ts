import { formatQuantity } from '@/features/Warehouses/lib/format';

/** "5 l", "2,5 u": cantidad con su unidad para los mensajes de faltante. */
export function formatQuantityWithUnit(quantity: string, unitAbbr: string | null | undefined): string {
  return unitAbbr ? `${formatQuantity(quantity)} ${unitAbbr}` : formatQuantity(quantity);
}

/** "10.0000" → "10", "2.5000" → "2.5": para precargar un input (solo recorta ceros decimales). */
export function trimDecimals(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}
