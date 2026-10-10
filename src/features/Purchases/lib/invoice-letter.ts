import { resolveLetter } from '@/features/Comercial/Facturacion/lib/invoice-type';
import { RECEIVER_VAT_CONDITIONS, isReceiverVatConditionId, type VoucherLetter } from '@/shared/lib/arca/catalogs';
import type { fiscal_tax_condition } from '@/generated/prisma/enums';

/**
 * Letra que tiene que emitir un proveedor a la empresa (spec Compras etapa 4 §3.2). Es la misma
 * regla de Facturacion (`resolveLetter`) con los roles invertidos: emite el proveedor y recibe la
 * empresa. Puro: lo usan el formulario (para mostrar la letra esperada) y el control del servidor.
 */

export type ExpectedLetter = { ok: true; letter: VoucherLetter; reason: string } | { ok: false; error: string };

/** Condicion del proveedor (id de ARCA) como emisor. `null` si no emite A, B ni C. */
export function supplierEmitterCondition(vatConditionId: number): fiscal_tax_condition | null {
  if (vatConditionId === 1) return 'responsable_inscripto';
  if (vatConditionId === 6 || vatConditionId === 13 || vatConditionId === 16) return 'monotributo';
  if (vatConditionId === 4) return 'exento';
  return null;
}

/** Condicion de la empresa (perfil fiscal) como receptora, en ids de ARCA. */
export function companyReceiverConditionId(taxCondition: fiscal_tax_condition): number {
  if (taxCondition === 'responsable_inscripto') return 1;
  if (taxCondition === 'monotributo') return 6;
  return 4;
}

export function expectedSupplierLetter(input: {
  supplierVatConditionId: number;
  supplierName: string;
  companyTaxCondition: fiscal_tax_condition | null;
}): ExpectedLetter {
  const { supplierVatConditionId, supplierName, companyTaxCondition } = input;
  if (!companyTaxCondition) {
    return {
      ok: false,
      error: 'No se pudo controlar la letra: faltan los datos fiscales de la empresa (Configuración → Datos fiscales).',
    };
  }
  const supplierLabel = isReceiverVatConditionId(supplierVatConditionId)
    ? RECEIVER_VAT_CONDITIONS[supplierVatConditionId].label
    : `la condición ${supplierVatConditionId}`;
  const emitter = supplierEmitterCondition(supplierVatConditionId);
  if (!emitter) {
    return { ok: false, error: `No se pudo controlar la letra: ${supplierName} figura como ${supplierLabel}.` };
  }
  const result = resolveLetter(emitter, companyReceiverConditionId(companyTaxCondition), 'la empresa');
  if (!result.ok) return { ok: false, error: `No se pudo controlar la letra: ${result.error}` };
  return {
    ok: true,
    letter: result.letter,
    reason: `${supplierName} es ${supplierLabel}: se espera Factura ${result.letter}.`,
  };
}
