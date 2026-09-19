// Tipos y constantes compartidos del feature de Mantenimiento.
// Vive aparte del actions.server porque archivos 'use server' solo pueden
// exportar funciones async — no objetos ni constantes.

export const OWNERSHIP_CATEGORIES = ['Propios', 'Leasing', 'Contratados'] as const;
export type OwnershipCategory = (typeof OWNERSHIP_CATEGORIES)[number];

// Estado derivado del vehiculo. Refleja directamente condition_enum
// (vehiculos dados de baja se excluyen de la lista, no se mapean a un status).
export const VEHICLE_STATUSES = [
  'operativo',
  'operativo_condicionado',
  'en_preparacion',
  'no_operativo',
  'en_reparacion',
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export type MaintenanceTypeOption = {
  id: string;
  name: string;
};

// Agregado de utilizacion: dias trabajados vs dias posibles del rango.
// possible = count * daysElapsed (capacidad teorica de la flota en el mes hasta hoy).
export type WorkdaysAggregate = {
  worked: number;
  possible: number;
};

// ── Resumen liviano del mes (se carga upfront) ──────────────────────────────
export type MaintenanceMonthSummary = {
  month: string;
  daysElapsed: number;
  daysInMonth: number;
  countsByCategory: Record<OwnershipCategory, number>;
  typesByCategory: Record<OwnershipCategory, MaintenanceTypeOption[]>;
  // Counts por condicion segmentados por categoria de tenencia.
  // Permite drill-down: al seleccionar una categoria, la banda de condiciones
  // muestra solo los counts de esa categoria.
  conditionCountsByCategory: Record<OwnershipCategory, Record<VehicleStatus, number>>;
  // Utilizacion de la flota: dias trabajados vs posibles por categoria.
  workdaysByCategory: Record<OwnershipCategory, WorkdaysAggregate>;
  earliestMonth: string | null;
};

// ── Detalle pesado por vehiculo (se carga al abrir cada acordeon) ───────────
export type MaintenanceVehicleWorkflows = {
  total: number;
  requests: number;
  orders: number;
  workOrders: number;
};

export type MaintenanceVehicle = {
  id: string;
  domain: string | null;
  brand: string | null;
  model: string | null;
  category: OwnershipCategory;
  typeId: string | null;
  typeName: string | null;
  subTypeId: string | null;
  subTypeName: string | null;
  status: VehicleStatus;
  workflows: MaintenanceVehicleWorkflows;
  workedDays: number;
};
