import { describe, expect, it } from 'vitest';
import { BAN_FOREVER, NO_BAN, planUserStatusChange } from './user-status';

const activeEmployee = { id: 'emp-1', is_active: true };
const inactiveEmployee = { id: 'emp-1', is_active: false };
const termination = { reason: 'Despido sin causa', date: new Date('2026-09-01T00:00:00Z') };

describe('planUserStatusChange — ban', () => {
  it('sin empleado vinculado: banea y desactiva la pertenencia, sin tocar legajo', () => {
    const plan = planUserStatusChange({ action: 'ban', linkedEmployee: null });
    expect(plan).toEqual({ banDuration: BAN_FOREVER, membershipActive: false, employee: null });
  });

  it('con empleado activo y datos de baja: da de baja el legajo con motivo (enum) y fecha', () => {
    const plan = planUserStatusChange({ action: 'ban', linkedEmployee: activeEmployee, employeeTermination: termination });
    expect(plan.banDuration).toBe(BAN_FOREVER);
    expect(plan.membershipActive).toBe(false);
    expect(plan.employee).toEqual({
      id: 'emp-1',
      is_active: false,
      reason_for_termination: 'Despido_sin_causa',
      termination_date: termination.date,
    });
  });

  it('con empleado activo pero sin datos de baja: sólo quita el acceso', () => {
    const plan = planUserStatusChange({ action: 'ban', linkedEmployee: activeEmployee });
    expect(plan.employee).toBeNull();
  });

  it('con empleado ya inactivo ignora los datos de baja', () => {
    const plan = planUserStatusChange({ action: 'ban', linkedEmployee: inactiveEmployee, employeeTermination: termination });
    expect(plan.employee).toBeNull();
  });

  it('motivo de baja inválido lanza', () => {
    expect(() =>
      planUserStatusChange({
        action: 'ban',
        linkedEmployee: activeEmployee,
        employeeTermination: { reason: 'cualquier cosa', date: termination.date },
      })
    ).toThrow(/Motivo de baja inválido/);
  });
});

describe('planUserStatusChange — unban', () => {
  it('sin empleado: quita el ban y reactiva la pertenencia', () => {
    const plan = planUserStatusChange({ action: 'unban', linkedEmployee: null });
    expect(plan).toEqual({ banDuration: NO_BAN, membershipActive: true, employee: null });
  });

  it('con empleado inactivo y reactivateEmployee: reactiva el legajo limpiando motivo y fecha', () => {
    const plan = planUserStatusChange({ action: 'unban', linkedEmployee: inactiveEmployee, reactivateEmployee: true });
    expect(plan.employee).toEqual({ id: 'emp-1', is_active: true, reason_for_termination: null, termination_date: null });
  });

  it('con empleado inactivo sin reactivateEmployee: no toca el legajo', () => {
    const plan = planUserStatusChange({ action: 'unban', linkedEmployee: inactiveEmployee, reactivateEmployee: false });
    expect(plan.employee).toBeNull();
  });

  it('con empleado ya activo ignora reactivateEmployee', () => {
    const plan = planUserStatusChange({ action: 'unban', linkedEmployee: activeEmployee, reactivateEmployee: true });
    expect(plan.employee).toBeNull();
  });
});
