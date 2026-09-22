import { describe, expect, it } from 'vitest';
import { resolveChecklistEmployeeId } from './checklist-attribution';

describe('resolveChecklistEmployeeId', () => {
  it('prioriza el employee_id del payload', () => {
    expect(resolveChecklistEmployeeId({ payload: 'p', cookie: 'c', metadata: 'm' })).toBe('p');
  });

  it('cae a la cookie cuando el payload no viene', () => {
    expect(resolveChecklistEmployeeId({ cookie: 'c', metadata: 'm' })).toBe('c');
  });

  it('cae a la metadata de sesión cuando no hay payload ni cookie', () => {
    // Caso de `dashboard/forms/[id]/new`: sin `defaultEmployeeId` ni cookie `empleado_id`,
    // la metadata es lo único que atribuye la respuesta a un empleado.
    expect(resolveChecklistEmployeeId({ metadata: 'm' })).toBe('m');
  });

  it('devuelve null sin ninguna fuente', () => {
    expect(resolveChecklistEmployeeId({})).toBeNull();
    expect(resolveChecklistEmployeeId({ payload: null, cookie: undefined, metadata: null })).toBeNull();
  });

  it('ignora cadenas vacías o en blanco y sigue con la fuente siguiente', () => {
    expect(resolveChecklistEmployeeId({ payload: '', cookie: '   ', metadata: 'm' })).toBe('m');
  });
});
