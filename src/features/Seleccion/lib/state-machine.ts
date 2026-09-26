import type { BadgeProps } from '@/components/ui/badge';
import type { pre_employee_status_enum } from '@/generated/prisma/client';

/**
 * Maquina de estados del candidato (ticket 505).
 *
 * Unica fuente de verdad de las transiciones: la consumen tanto las server actions
 * (que validan antes de tocar la base) como la UI (que deriva que botones mostrar).
 * Agregar un estado o una transicion se hace SOLO editando la tabla de abajo.
 *
 * Flujo pedido por el ticket:
 *   en proceso  -> pre ingreso | rechazado
 *   pre ingreso -> legajo (aprobar) | rechazado
 *   rechazado   -> en proceso (para poder reingresarlo)
 */

export type PreEmployeeStatus = pre_employee_status_enum;

export type PreEmployeeTransitionAction = 'submit' | 'reject' | 'reopen' | 'approve';

/** Accion de permiso requerida: RRHH opera con `update`, gerencia decide con `approve`. */
type RequiredPermissionAction = 'update' | 'approve';

export interface PreEmployeeTransition {
  from: PreEmployeeStatus;
  action: PreEmployeeTransitionAction;
  to: PreEmployeeStatus;
  requiredPermissionAction: RequiredPermissionAction;
  /** El motivo es obligatorio (rechazo). */
  requiresReason: boolean;
  /** Etiqueta del boton en la UI. */
  label: string;
}

export const PRE_EMPLOYEE_TRANSITIONS: readonly PreEmployeeTransition[] = [
  {
    from: 'en_proceso',
    action: 'submit',
    to: 'pre_ingreso',
    requiredPermissionAction: 'update',
    requiresReason: false,
    label: 'Enviar a pre ingreso',
  },
  {
    from: 'en_proceso',
    action: 'reject',
    to: 'rechazado',
    requiredPermissionAction: 'approve',
    requiresReason: true,
    label: 'Rechazar',
  },
  {
    from: 'pre_ingreso',
    action: 'approve',
    to: 'legajo',
    requiredPermissionAction: 'approve',
    requiresReason: false,
    label: 'Aprobar y crear legajo',
  },
  {
    from: 'pre_ingreso',
    action: 'reject',
    to: 'rechazado',
    requiredPermissionAction: 'approve',
    requiresReason: true,
    label: 'Rechazar',
  },
  {
    from: 'rechazado',
    action: 'reopen',
    to: 'en_proceso',
    requiredPermissionAction: 'update',
    requiresReason: false,
    label: 'Reabrir',
  },
] as const;

/** Transiciones disponibles desde un estado (sin filtrar por permisos). */
export function getAvailableTransitions(from: PreEmployeeStatus): PreEmployeeTransition[] {
  return PRE_EMPLOYEE_TRANSITIONS.filter((transition) => transition.from === from);
}

export function findTransition(
  from: PreEmployeeStatus,
  action: PreEmployeeTransitionAction
): PreEmployeeTransition | undefined {
  return PRE_EMPLOYEE_TRANSITIONS.find((transition) => transition.from === from && transition.action === action);
}

/**
 * Valida una transicion y devuelve su definicion. Las server actions la llaman SIEMPRE
 * como primer paso: nunca se confia en que la UI haya deshabilitado el boton.
 */
export function assertTransition(from: PreEmployeeStatus, action: PreEmployeeTransitionAction): PreEmployeeTransition {
  const transition = findTransition(from, action);

  if (!transition) {
    throw new Error(`Transición inválida: no se puede pasar de "${STATUS_LABELS[from]}" con la acción "${action}"`);
  }

  return transition;
}

/** El candidato ya fue convertido en empleado: es un estado terminal, solo lectura. */
export function isTerminalStatus(status: PreEmployeeStatus): boolean {
  return getAvailableTransitions(status).length === 0;
}

/** Los datos del candidato solo se editan mientras esta en proceso o en pre ingreso. */
export function isEditableStatus(status: PreEmployeeStatus): boolean {
  return status === 'en_proceso' || status === 'pre_ingreso';
}

// ─── Etiquetas de UI ──────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<PreEmployeeStatus, string> = {
  en_proceso: 'En proceso',
  pre_ingreso: 'Pre ingreso',
  rechazado: 'Rechazado',
  legajo: 'Legajo creado',
};

/** Un color por etapa del circuito: en curso (amarillo), a decidir (azul), alta (verde), rechazo (rojo). */
export const STATUS_VARIANTS: Record<PreEmployeeStatus, NonNullable<BadgeProps['variant']>> = {
  en_proceso: 'warning',
  pre_ingreso: 'info',
  rechazado: 'destructive',
  legajo: 'success',
};
