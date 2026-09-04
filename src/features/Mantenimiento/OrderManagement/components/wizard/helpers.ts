import { getRepairItemLabel } from '@/features/Mantenimiento/shared/repair-item-label';

import type { LocalItem } from '../ManageOrderWizard';

/**
 * Returns the best available label for a maintenance order item.
 *
 * Delega en el helper compartido del modulo: la cadena propia solo miraba
 * `description` y el label del checklist, asi que un item de carga manual (que guarda
 * su texto en `free_text`, o solo tiene la tarea del listado) se dibujaba EN BLANCO
 * justo en el paso donde el jefe de taller decide a que sector mandarlo.
 *
 * Se mantiene el retorno nullable porque los pasos ya tienen su propio fallback.
 */
export function getItemLabel(item: LocalItem): string | null {
  return getRepairItemLabel(item, '') || null;
}

/**
 * Returns repair type names for an item.
 */
export function getItemRepairTypeNames(item: LocalItem, repairTypes: Array<{ id: string; name: string }>): string[] {
  if (item._isTemp && item._tempRepairTypeIds) {
    return item._tempRepairTypeIds
      .map((id) => repairTypes.find((rt) => rt.id === id)?.name)
      .filter((name): name is string => !!name);
  }

  const pivotTypes = item.maintenance_order_item_repair_types || [];
  if (pivotTypes.length > 0) {
    return pivotTypes.map((rt) => rt.types_of_repairs?.name).filter((name): name is string => !!name);
  }

  if (item.types_of_repairs?.name) {
    return [String(item.types_of_repairs.name)];
  }

  return [];
}

/**
 * Returns repair type IDs for an item.
 */
export function getItemRepairTypeIds(item: LocalItem): string[] {
  if (item._isTemp && item._tempRepairTypeIds) {
    return item._tempRepairTypeIds;
  }

  const pivotTypes = item.maintenance_order_item_repair_types || [];
  if (pivotTypes.length > 0) {
    return pivotTypes.map((rt) => rt.repair_type_id).filter(Boolean) as string[];
  }

  if (item.repair_type_id) {
    return [item.repair_type_id];
  }

  return [];
}
