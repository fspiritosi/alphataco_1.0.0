import { describe, expect, it } from 'vitest';
import { assertOperatorAction, canOperatorAct, resolveWorkOrderCloseStatus } from './work-order-status';

describe('canOperatorAct', () => {
  it('sólo deja iniciar una OT pendiente', () => {
    expect(canOperatorAct('pending', 'start')).toBe(true);
    expect(canOperatorAct('in_progress', 'start')).toBe(false);
    expect(canOperatorAct('paused', 'start')).toBe(false);
  });

  it('sólo deja pausar una OT en progreso', () => {
    expect(canOperatorAct('in_progress', 'pause')).toBe(true);
    expect(canOperatorAct('paused', 'pause')).toBe(false);
    expect(canOperatorAct('pending', 'pause')).toBe(false);
  });

  it('sólo deja reanudar una OT pausada', () => {
    expect(canOperatorAct('paused', 'resume')).toBe(true);
    expect(canOperatorAct('in_progress', 'resume')).toBe(false);
  });

  it('deja cerrar una OT ya iniciada, en progreso o pausada', () => {
    expect(canOperatorAct('in_progress', 'close')).toBe(true);
    expect(canOperatorAct('paused', 'close')).toBe(true);
    expect(canOperatorAct('pending', 'close')).toBe(false);
  });

  it('no deja hacer nada sobre una OT cerrada o cancelada', () => {
    for (const status of ['completed', 'completed_partial', 'cancelled']) {
      for (const action of ['start', 'pause', 'resume', 'close'] as const) {
        expect(canOperatorAct(status, action)).toBe(false);
      }
    }
  });
});

describe('assertOperatorAction', () => {
  it('no lanza cuando la acción es válida', () => {
    expect(() => assertOperatorAction('pending', 'start')).not.toThrow();
  });

  it('usa el mensaje de la acción cuando la OT está abierta en otro estado', () => {
    expect(() => assertOperatorAction('paused', 'pause')).toThrow('Solo se puede pausar una OT que esté en progreso');
    expect(() => assertOperatorAction('in_progress', 'resume')).toThrow(
      'Solo se puede reanudar una OT que esté pausada'
    );
    expect(() => assertOperatorAction('pending', 'close')).toThrow('primero debe iniciarla');
    expect(() => assertOperatorAction('in_progress', 'start')).toThrow('Solo se puede iniciar una OT pendiente');
  });

  it('avisa que la OT ya está cerrada en lugar de repetir el mensaje de la acción', () => {
    expect(() => assertOperatorAction('completed', 'close')).toThrow('ya está completada');
    expect(() => assertOperatorAction('completed_partial', 'pause')).toThrow('ya está completada parcial');
  });

  it('avisa que la OT está cancelada', () => {
    expect(() => assertOperatorAction('cancelled', 'start')).toThrow('está cancelada');
  });
});

describe('resolveWorkOrderCloseStatus', () => {
  it('cierra completa cuando todas las tareas están completas', () => {
    expect(resolveWorkOrderCloseStatus(['completed', 'completed'])).toBe('completed');
  });

  it('cierra parcial si queda alguna tarea sin completar', () => {
    expect(resolveWorkOrderCloseStatus(['completed', 'pending'])).toBe('completed_partial');
    expect(resolveWorkOrderCloseStatus(['reassignment_requested'])).toBe('completed_partial');
  });

  it('una OT sin tareas cierra completa', () => {
    expect(resolveWorkOrderCloseStatus([])).toBe('completed');
  });
});
