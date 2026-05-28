/**
 * Resuelve la medida efectiva de un eje aplicando el override de vehículo
 * sobre la medida de plantilla.
 *
 * Precedencia: vehicle_override > template_axle.tire_size > null
 */
export function resolveAxleTireSize(
  templateAxleSize: string | null,
  vehicleOverride: string | null | undefined
): string | null {
  return vehicleOverride ?? templateAxleSize ?? null;
}

/**
 * Dada una lista de axles de plantilla y un map de overrides por axle_number,
 * devuelve los axle_number cuya medida efectiva es null.
 */
export function getAxlesMissingSize(
  axles: Array<{ axle_number: number; tire_size: string | null }>,
  overrides: Map<number, string>
): number[] {
  return axles
    .filter((a) => !resolveAxleTireSize(a.tire_size, overrides.get(a.axle_number)))
    .map((a) => a.axle_number);
}
