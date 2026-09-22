import type { reason_for_termination_enum } from '@/generated/prisma/client';
import { reasonForTerminationLabels } from '@/shared/utils/mappers';

/**
 * El formulario de baja envía la etiqueta visible ("Despido sin causa"), que coincide con el
 * valor del enum en Postgres (`@map`). Prisma espera el nombre del enum (`Despido_sin_causa`).
 */
export function toTerminationReason(value: string | undefined | null): reason_for_termination_enum | null {
  if (!value) return null;
  for (const [key, label] of Object.entries(reasonForTerminationLabels)) {
    if (value === key || value === label) return key as reason_for_termination_enum;
  }
  throw new Error(`Motivo de baja inválido: ${value}`);
}
