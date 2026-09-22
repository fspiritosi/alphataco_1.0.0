/**
 * Tipos del módulo de pedidos (preparte) compartidos entre el formulario y las
 * server actions. Módulo sin directiva: lo importan tanto el cliente como el servidor.
 */

/** Payload de alta/edición de un pedido tal como lo arma el formulario. */
export type Preparte = {
  id?: string;
  cliente_id: string;
  contrato_id: string;
  tipo: string;
  jornada: string;
  start_time?: string | null;
  end_time?: string | null;
  solicitante: string;
  status?: string;
  item?: string | null;
  observaciones?: string | null;
  /** `null` cuando el pedido está sujeto a disponibilidad operativa. */
  executionDate: string | null;
  requestDate: string;
  quantity?: number;
  numero_pedido: string;
  sector_service_id?: string | null;
  areas_service_id?: string | null;
  equipos_cliente?: string | null;
  /** URL o ruta de la imagen del pedido. */
  preparteImage?: string | null;
  confirmed_by?: string | null;
  /** Los `*_by` los deriva el servidor de la sesión: nunca se aceptan del cliente. */
  rejected_by?: string | null;
  cancelled_by?: string | null;
  reprogrammed_by?: string | null;
  cancel_reason?: string | null;
  rejected_reason?: string | null;
  reprogram_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  subject_to_availability?: boolean;
  /** FK a `preparte.id` (self-referencial) para pedidos reprogramados. */
  reprogram?: string | null;
};

/** Entrada del historial de cambios de un pedido. */
export type PreparteChangeLog = {
  preparte_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  changed_by?: string;
  metadata?: Record<string, string | number | boolean | null>;
};
