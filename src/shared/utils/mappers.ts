import type { BadgeProps } from '@/components/ui/badge';

// ============================================================================
// EMPLOYEE ENUM LABELS
// ============================================================================

export const genderLabels: Record<string, string> = {
  Masculino: 'Masculino',
  Femenino: 'Femenino',
  No_Declarado: 'No Declarado',
};

export const nationalityLabels: Record<string, string> = {
  Argentina: 'Argentina',
  Extranjero: 'Extranjero',
};

export const documentTypeLabels: Record<string, string> = {
  DNI: 'DNI',
  LE: 'LE',
  LC: 'LC',
  PASAPORTE: 'Pasaporte',
};

export const maritalStatusLabels: Record<string, string> = {
  Casado: 'Casado',
  Soltero: 'Soltero',
  Divorciado: 'Divorciado',
  Viudo: 'Viudo',
  Separado: 'Separado',
  Union_de_hecho: 'Union de hecho',
};

export const levelOfEducationLabels: Record<string, string> = {
  Primario: 'Primario',
  Secundario: 'Secundario',
  Terciario: 'Terciario',
  Universitario: 'Universitario',
  PosGrado: 'Pos Grado',
};

export const costTypeLabels: Record<string, string> = {
  Directo: 'Directo',
  Indirecto: 'Indirecto',
};

export const affiliateStatusLabels: Record<string, string> = {
  Dentro_de_convenio: 'Dentro de convenio',
  Fuera_de_convenio: 'Fuera de convenio',
};

export const employeeStatusLabels: Record<string, string> = {
  Avalado: 'Avalado',
  No_avalado: 'No avalado',
  Incompleto: 'Incompleto',
  Completo: 'Completo',
  Completo_con_doc_vencida: 'Completo con doc vencida',
};

export const reasonForTerminationLabels: Record<string, string> = {
  Despido_sin_causa: 'Despido sin causa',
  Renuncia: 'Renuncia',
  Despido_con_causa: 'Despido con causa',
  Acuerdo_de_partes: 'Acuerdo de partes',
  Fin_de_contrato: 'Fin de contrato',
  Fallecimiento: 'Fallecimiento',
};

// ============================================================================
// OTHER EQUIPMENT ENUM LABELS
// ============================================================================

/**
 * Labels para condition_enum (state prisma: operativo, no_operativo, en_reparacion,
 * operativo_condicionado, en_preparacion)
 */
export const conditionLabels: Record<string, string> = {
  operativo: 'Operativo',
  no_operativo: 'No operativo',
  en_reparacion: 'En reparación',
  operativo_condicionado: 'Operativo condicionado',
  en_preparacion: 'En preparación',
};

/**
 * Labels para status_type aplicado a equipos (Avalado, No_avalado, Incompleto,
 * Completo, Completo_con_doc_vencida)
 */
export const otherEquipmentStatusLabels: Record<string, string> = {
  Avalado: 'Avalado',
  No_avalado: 'No avalado',
  Incompleto: 'Incompleto',
  Completo: 'Completo',
  Completo_con_doc_vencida: 'Completo con doc vencida',
};

/**
 * Labels para currency_enum (USD, EUR, GBP, ARS)
 */
export const currencyLabels: Record<string, string> = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  ARS: 'ARS',
};

/**
 * Labels para termination_reason_enum aplicado a equipos
 * (venta, destrucción total, devolución, otro)
 */
export const terminationReasonEquipmentLabels: Record<string, string> = {
  venta: 'Venta',
  destrucci_n_total: 'Destrucción total',
  devoluci_n: 'Devolución',
  otro: 'Otro',
};

/**
 * Labels para contract_type_vehicles_enum
 * (Leasing, Alquiler, Propio, Prendado)
 */
export const contractTypeVehiclesLabels: Record<string, string> = {
  Leasing: 'Leasing',
  Alquiler: 'Alquiler',
  Propio: 'Propio',
  Prendado: 'Prendado',
};

// ============================================================================
// BADGE CONFIGS
// ============================================================================

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const employeeStatusBadges: Record<string, BadgeVariant> = {
  Avalado: 'success',
  No_avalado: 'destructive',
  Incompleto: 'destructive',
  Completo: 'success',
  Completo_con_doc_vencida: 'yellow',
};

// ============================================================================
// DAILY REPORT ENUM LABELS
// ============================================================================

/**
 * Labels para daily_report_header_status_new
 * (abierto, cerrado, cerrado_completo, cerrado_incompleto)
 */
export const dailyReportStatusLabels: Record<string, string> = {
  abierto: 'Abierto',
  cerrado: 'Cerrado',
  cerrado_completo: 'Cerrado completo',
  cerrado_incompleto: 'Cerrado incompleto',
};

export const dailyReportStatusBadges: Record<string, BadgeVariant> = {
  abierto: 'default',
  cerrado: 'destructive',
  cerrado_completo: 'success',
  cerrado_incompleto: 'destructive',
};

// ============================================================================
// FORMULARIOS ENUM LABELS
// ============================================================================

/**
 * Labels para el tipo de fuente de formularios
 * (checklist_template, custom_form)
 */
export const formSourceLabels: Record<string, string> = {
  checklist_template: 'Normalizado',
  custom_form: 'Formulario personalizado',
};

// ============================================================================
// MANTENIMIENTO / REPARACIONES ENUM LABELS
// ============================================================================

/**
 * Labels para repair_state
 * Los keys son los valores del enum Prisma generado (con underscore), los values son labels legibles.
 * En la BD se almacenan los valores @map (con espacios/acentos), pero Prisma TypeScript usa los keys.
 */
export const repairStateLabels: Record<string, string> = {
  Pendiente: 'Pendiente',
  Esperando_repuestos: 'Esperando repuestos',
  En_reparaci_n: 'En reparación',
  Finalizado: 'Finalizado',
  Rechazado: 'Rechazado',
  Cancelado: 'Cancelado',
  Programado: 'Programado',
};

export const repairStateBadges: Record<string, BadgeVariant> = {
  Pendiente: 'default',
  Esperando_repuestos: 'yellow',
  En_reparaci_n: 'default',
  Finalizado: 'success',
  Rechazado: 'destructive',
  Cancelado: 'destructive',
  Programado: 'default',
};

/**
 * Labels para criticidad de tipos de reparación (Baja, Media, Alta)
 */
export const repairCriticityLabels: Record<string, string> = {
  Baja: 'Baja',
  Media: 'Media',
  Alta: 'Alta',
};

// ============================================================================
// DAILY REPORT ROW ENUM LABELS
// ============================================================================

/**
 * Labels para daily_report_status (status de filas del parte diario)
 */
export const dailyReportRowStatusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  sin_recursos_asignados: 'Sin recursos',
  ejecutado: 'Ejecutado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
  en_certificacion: 'En certificación',
};

/**
 * Labels para daily_report_type_enum (tipo de servicio del parte diario)
 */
export const dailyReportTypeLabels: Record<string, string> = {
  mensual: 'Mensual',
  adicional: 'Adicional',
  adicional_permanente: 'Adicional permanente',
};

// ============================================================================
// GENERIC HELPER
// ============================================================================

/**
 * Obtiene el label legible de un valor de enum.
 * Si no encuentra el valor, reemplaza underscores por espacios.
 */
export function getEnumLabel(value: string | null | undefined, labels: Record<string, string>): string {
  if (!value) return '-';
  return labels[value] ?? value.replace(/_/g, ' ');
}
