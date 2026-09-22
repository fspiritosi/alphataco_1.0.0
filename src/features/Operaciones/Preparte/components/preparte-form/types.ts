/**
 * Tipos compartidos por las secciones del formulario de pedido.
 */

/** Contrato (servicio) del cliente, como lo devuelve `fetchContractsByClientId`. */
export interface Contrato {
  id: string;
  service_name: string | null;
}

/** Opción de un combo de ítems del contrato. */
export interface ContractItemOption {
  label: string;
  value: string;
}

/** Sector del contrato: `id` es el `service_sectors.id` y `sector_id` el del catálogo. */
export interface SectorOption {
  id: string;
  sector_id: string;
  name: string;
}

/** Área del contrato: `id` es el `service_areas.id` y `area_id` el del área del cliente. */
export interface AreaOption {
  id: string;
  area_id: string;
  name: string;
}

/** Equipo del cliente. */
export interface EquipmentOption {
  id: string;
  name: string;
  customer_id: string;
}

/** Línea de ítem del formulario (PP-3: jornada, tipo, fecha y observaciones por ítem). */
export interface ItemRow {
  id: string;
  quantity: number;
  jornada: string;
  tipo: string;
  observaciones: string;
  start_time: string;
  end_time: string;
  executionDate?: { from?: Date; to?: Date };
  subject_to_availability: boolean;
}

/** Valores por defecto de una línea de ítem nueva. */
export const DEFAULT_ITEM_ROW: ItemRow = {
  id: '',
  quantity: 1,
  jornada: '',
  tipo: '',
  observaciones: '',
  start_time: '',
  end_time: '',
  executionDate: { from: undefined, to: undefined },
  subject_to_availability: false,
};
