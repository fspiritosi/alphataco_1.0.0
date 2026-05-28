export const TIRE_READINESS_MESSAGES = {
  no_template: (domain: string) =>
    `El equipo ${domain} no tiene plantilla de cubiertas asignada.`,
  missing_sizes: (domain: string, axles: number[]) =>
    `El equipo ${domain} no tiene medidas configuradas para los ejes: ${axles.join(', ')}. ` +
    `Configurelas en la tab Cubiertas del equipo.`,
};
