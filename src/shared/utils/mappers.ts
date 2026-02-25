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
