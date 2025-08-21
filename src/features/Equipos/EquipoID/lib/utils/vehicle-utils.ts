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

export function getVehicleTypeFields(typeOfVehicle: string) {
  const isVehicle = typeOfVehicle === 'Vehículos';

  return {
    showDomain: isVehicle,
    showChassis: isVehicle,
    showKilometer: isVehicle,
    showSerie: !isVehicle,
    requireDomain: isVehicle,
    requireChassis: isVehicle,
    requireSerie: !isVehicle,
  };
}

export function formatVehicleDisplay(vehicle: any): string {
  const parts = [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean);
  return parts.join(' ') || 'Equipo sin especificar';
}
