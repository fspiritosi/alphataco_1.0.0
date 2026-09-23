import { toTerminationReason } from '@/features/Employees/EmpleadoID/lib/termination-reason';
import type { reason_for_termination_enum } from '@/generated/prisma/client';

/**
 * Lógica pura de dar de baja / reactivar un usuario de la empresa: qué pasa con el ban de la
 * credencial, con `share_company_users.is_active` y con el legajo vinculado. Las server actions
 * ejecutan el plan; acá no hay acceso a la base.
 *
 * El ban dejó de ser una duración (`ban_duration` de Supabase Auth) y pasó a ser el booleano
 * `auth_user.banned`, que corta el alta de sesión en el hook `session.create.before` de
 * `shared/lib/auth.ts` — vale para contraseña, Google y sesión anónima por igual.
 */


export interface LinkedEmployee {
  id: string;
  is_active: boolean | null;
}

export type UserStatusInput =
  | { action: 'ban'; linkedEmployee: LinkedEmployee | null; employeeTermination?: { reason: string; date: Date } }
  | { action: 'unban'; linkedEmployee: LinkedEmployee | null; reactivateEmployee?: boolean };

export interface EmployeeStatusChange {
  id: string;
  is_active: boolean;
  reason_for_termination: reason_for_termination_enum | null;
  termination_date: Date | null;
}

export interface UserStatusPlan {
  /** `true` = la credencial queda baneada (no puede abrir sesión). */
  banned: boolean;
  membershipActive: boolean;
  /** Cambio a aplicar sobre el legajo vinculado, o null si no se toca. */
  employee: EmployeeStatusChange | null;
}

export function planUserStatusChange(input: UserStatusInput): UserStatusPlan {
  const employee = input.linkedEmployee;

  if (input.action === 'ban') {
    const shouldTerminate = Boolean(employee?.is_active && input.employeeTermination);
    return {
      banned: true,
      membershipActive: false,
      employee:
        shouldTerminate && employee && input.employeeTermination
          ? {
              id: employee.id,
              is_active: false,
              reason_for_termination: toTerminationReason(input.employeeTermination.reason),
              termination_date: input.employeeTermination.date,
            }
          : null,
    };
  }

  const shouldReactivate = Boolean(employee && !employee.is_active && input.reactivateEmployee);
  return {
    banned: false,
    membershipActive: true,
    employee:
      shouldReactivate && employee
        ? { id: employee.id, is_active: true, reason_for_termination: null, termination_date: null }
        : null,
  };
}
