import { describe, expect, it } from 'vitest';
import {
  PRE_EMPLOYEE_TRANSITIONS,
  assertTransition,
  findTransition,
  getAvailableTransitions,
  isEditableStatus,
  isTerminalStatus,
  type PreEmployeeStatus,
  type PreEmployeeTransitionAction,
} from './state-machine';

/**
 * Flujo del ticket 505:
 *   en_proceso  -> pre_ingreso | rechazado
 *   pre_ingreso -> legajo | rechazado
 *   rechazado   -> en_proceso
 *   legajo      -> (terminal)
 */
describe('state-machine de candidatos', () => {
  describe('transiciones permitidas', () => {
    const allowed: [PreEmployeeStatus, PreEmployeeTransitionAction, PreEmployeeStatus][] = [
      ['en_proceso', 'submit', 'pre_ingreso'],
      ['en_proceso', 'reject', 'rechazado'],
      ['pre_ingreso', 'approve', 'legajo'],
      ['pre_ingreso', 'reject', 'rechazado'],
      ['rechazado', 'reopen', 'en_proceso'],
    ];

    it.each(allowed)('%s --%s--> %s', (from, action, to) => {
      const transition = assertTransition(from, action);
      expect(transition.to).toBe(to);
      expect(findTransition(from, action)).toEqual(transition);
    });

    it('la tabla tiene exactamente las 5 transiciones del ticket', () => {
      expect(PRE_EMPLOYEE_TRANSITIONS).toHaveLength(5);
    });

    it('rechazar exige motivo y permiso de aprobación; el resto no pide motivo', () => {
      for (const transition of PRE_EMPLOYEE_TRANSITIONS) {
        if (transition.action === 'reject') {
          expect(transition.requiresReason).toBe(true);
          expect(transition.requiredPermissionAction).toBe('approve');
        } else {
          expect(transition.requiresReason).toBe(false);
        }
      }
      expect(assertTransition('pre_ingreso', 'approve').requiredPermissionAction).toBe('approve');
      expect(assertTransition('en_proceso', 'submit').requiredPermissionAction).toBe('update');
      expect(assertTransition('rechazado', 'reopen').requiredPermissionAction).toBe('update');
    });
  });

  describe('transiciones prohibidas', () => {
    const forbidden: [PreEmployeeStatus, PreEmployeeTransitionAction][] = [
      ['en_proceso', 'approve'], // no se aprueba sin pasar por pre ingreso
      ['en_proceso', 'reopen'],
      ['pre_ingreso', 'submit'],
      ['pre_ingreso', 'reopen'],
      ['rechazado', 'approve'],
      ['rechazado', 'submit'],
      ['rechazado', 'reject'],
      ['legajo', 'submit'],
      ['legajo', 'reject'],
      ['legajo', 'reopen'],
      ['legajo', 'approve'],
    ];

    it.each(forbidden)('%s --%s--> lanza', (from, action) => {
      expect(findTransition(from, action)).toBeUndefined();
      expect(() => assertTransition(from, action)).toThrow(/Transición inválida/);
    });
  });

  describe('estados terminal y editable', () => {
    it('legajo es terminal: no tiene transiciones disponibles', () => {
      expect(getAvailableTransitions('legajo')).toEqual([]);
      expect(isTerminalStatus('legajo')).toBe(true);
    });

    it('los demás estados no son terminales', () => {
      for (const status of ['en_proceso', 'pre_ingreso', 'rechazado'] as const) {
        expect(isTerminalStatus(status)).toBe(false);
        expect(getAvailableTransitions(status).length).toBeGreaterThan(0);
      }
    });

    it('sólo en_proceso y pre_ingreso son editables', () => {
      expect(isEditableStatus('en_proceso')).toBe(true);
      expect(isEditableStatus('pre_ingreso')).toBe(true);
      expect(isEditableStatus('rechazado')).toBe(false);
      expect(isEditableStatus('legajo')).toBe(false);
    });
  });
});
