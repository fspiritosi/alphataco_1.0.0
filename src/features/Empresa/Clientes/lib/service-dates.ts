/**
 * Fechas de contratos (`customer_services.service_start` / `service_validity`): columnas `date`
 * de Postgres, sin hora. Estos helpers evitan que el día se corra por la zona horaria.
 */

/**
 * Columnas `date` llegan de Prisma como `Date` a medianoche UTC. Para mostrarlas en un
 * calendario local sin correr el día, se reconstruye la fecha con los componentes UTC.
 */
export function dbDateToLocal(value: Date): Date {
  return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/**
 * Un día elegido en el calendario (hora local) viaja al servidor como medianoche UTC de ese
 * mismo día: así Prisma escribe la columna `date` sin depender de la zona horaria del server.
 */
export function localDateToDb(value: Date): Date {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}
