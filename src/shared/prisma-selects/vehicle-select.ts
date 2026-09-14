/**
 * Campos de un vehiculo tal como los muestra la tabla de Equipos.
 *
 * Compartido con la API externa (ticket 671) por el mismo motivo que
 * EMPLOYEE_SELECT: una sola definicion de "el dato completo".
 */
export const VEHICLE_SELECT = {
  id: true,
  domain: true,
  chassis: true,
  engine: true,
  serie: true,
  intern_number: true,
  year: true,
  condition: true,
  status: true,
  kilometer: true,
  engine_hours: true,
  type_of_contract: true,
  contract_expiration_date: true,
  contract_start_date: true,
  contract_number: true,
  currency: true,
  price: true,
  cost_type: true,
  termination_date: true,
  reason_for_termination: true,
  created_at: true,
  is_active: true,
  picture: true,
  // Raw Int FK scalars — seleccionados para usar en filterFn.
  brand: true,
  model: true,
  // FK relations
  type_vehicles_typeTotype: { select: { id: true, name: true } },
  sub_type: { select: { id: true, name: true } },
  brand_vehicles: { select: { name: true } },
  model_vehicles: { select: { name: true } },
  equipment_owners: { select: { id: true, name: true } },
  hierarchy: { select: { id: true, name: true } },
  cost_center: { select: { id: true, name: true } },
  types_of_vehicles: { select: { id: true, name: true } },
  // M:M relation
  contractor_equipment: {
    select: {
      customers: { select: { id: true, name: true } },
    },
  },
} as const;
