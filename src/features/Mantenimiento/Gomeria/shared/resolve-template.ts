/**
 * Resolves the effective tire_template_id for a vehicle.
 * Priority: vehicle override > sub-type inheritance.
 */
export function resolveVehicleTireTemplateId(vehicle: {
  tire_template_id?: string | null;
  sub_type?: { tire_template_id?: string | null } | null;
}): string | null {
  return vehicle.tire_template_id ?? vehicle.sub_type?.tire_template_id ?? null;
}
