/**
 * Vigencia de contratos (`customer_services`): `service_start` / `service_validity` son
 * columnas `date` (sin hora). Todo se compara a nivel de día en hora local.
 */
export type ContractStatus = 'vigente' | 'vencido' | 'inactivo';

type DateInput = string | Date | null | undefined;

interface ContractDates {
  service_start: DateInput;
  service_validity: DateInput;
}

interface ContractLike extends ContractDates {
  is_active: boolean | null | undefined;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** `Date` o string ISO → `YYYY-MM-DD` (hora local para `Date`; recorte para strings). */
export function toIsoDate(value: DateInput): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${mm}-${dd}`;
  }
  const match = ISO_DATE_RE.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** Día local (sin hora) como número comparable `YYYYMMDD`, o null si no hay fecha válida. */
function toDayNumber(value: DateInput): number | null {
  const iso = toIsoDate(value);
  return iso ? Number(iso.replace(/-/g, '')) : null;
}

/** Vigente = ya empezó y (no tiene validez o la validez es hoy o posterior). */
export function isContractInForce(contract: ContractDates, today: Date = new Date()): boolean {
  const day = toDayNumber(today);
  if (day === null) return false;
  const start = toDayNumber(contract.service_start);
  const end = toDayNumber(contract.service_validity);
  if (start !== null && start > day) return false;
  if (end !== null && end < day) return false;
  return true;
}

/** Estado para la UI: `inactivo` manda sobre las fechas; `is_active` null cuenta como activo. */
export function getContractStatus(contract: ContractLike, today: Date = new Date()): ContractStatus {
  if (contract.is_active === false) return 'inactivo';
  return isContractInForce(contract, today) ? 'vigente' : 'vencido';
}

/**
 * Columnas `date` de Postgres llegan de Prisma como `Date` a medianoche UTC. Para mostrarlas
 * en un calendario local sin correr el día, se reconstruye la fecha con los componentes UTC.
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
