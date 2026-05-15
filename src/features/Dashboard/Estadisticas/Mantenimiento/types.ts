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

// ── Resumen liviano del mes (se carga upfront) ──────────────────────────────
export type MaintenanceMonthSummary = {
  month: string;
  daysElapsed: number;
  daysInMonth: number;
  countsByCategory: Record<OwnershipCategory, number>;
  typesByCategory: Record<OwnershipCategory, MaintenanceTypeOption[]>;
  conditionCounts: Record<VehicleStatus, number>;
  earliestMonth: string | null;
};

// ── Detalle pesado por vehiculo (se carga al abrir cada acordeon) ───────────
export type MaintenanceVehicleWorkflows = {
  total: number;
  requests: number;
  orders: number;
  repairs: number;
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
