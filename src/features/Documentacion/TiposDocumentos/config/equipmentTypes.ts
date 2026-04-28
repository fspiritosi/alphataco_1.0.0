/**
 * Valores permitidos para document_types.equipment_type.
 *
 * Deben coincidir EXACTAMENTE con el check constraint de la BD:
 *   CHECK (equipment_type IN ('vehicle', 'other_equipment'))
 */
export const EQUIPMENT_TYPE_VALUES = ['vehicle', 'other_equipment'] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPE_VALUES)[number];

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  vehicle: 'Vehículo',
  other_equipment: 'Otro',
};

export const EQUIPMENT_TYPE_OPTIONS: { value: EquipmentType; label: string }[] = EQUIPMENT_TYPE_VALUES.map((value) => ({
  value,
  label: EQUIPMENT_TYPE_LABELS[value],
}));

export function getEquipmentTypeLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return EQUIPMENT_TYPE_LABELS[value as EquipmentType] ?? value;
}
