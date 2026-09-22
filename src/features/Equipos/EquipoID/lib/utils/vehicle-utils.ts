export function validateDomain(domain: string, year: number): boolean {
  const oldRegex = /^[A-Za-z]{3}[0-9]{3}$/;
  const newRegex = /^[A-Za-z]{2}[0-9]{3}[A-Za-z]{2}$/;

  if (year <= 2015) {
    return oldRegex.test(domain);
  } else if (year >= 2017) {
    return newRegex.test(domain);
  } else {
    // 2016 can use either format
    return oldRegex.test(domain) || newRegex.test(domain);
  }
}

/**
 * Id de "Vehículos" en la tabla `types_of_vehicles`.
 * Es el unico valor valido en el form de vehiculos: los "Otros" (id 2) quedaron
 * obsoletos cuando se creo la entidad `other_equipment`, que tiene su propio form.
 */
export const VEHICLE_TYPE_OF_VEHICLE_ID = '1';

export function getVehicleTypeFields(typeOfVehicle: string) {
  const isVehicle = typeOfVehicle === 'Vehículos';

  return {
    showDomain: isVehicle,
    showChassis: isVehicle,
    showKilometer: true,
    showEngineHours: true,
    showSerie: !isVehicle,
    requireDomain: isVehicle,
    requireChassis: isVehicle,
    requireSerie: !isVehicle,
  };
}
