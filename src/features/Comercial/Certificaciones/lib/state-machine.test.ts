import { describe, expect, it } from 'vitest';
import { canTransition, isDeletable, isEditable, transitionError } from './state-machine';

describe('máquina de estados de la certificación', () => {
  it('el camino feliz: borrador → emitida → confirmada', () => {
    expect(canTransition('borrador', 'emitida')).toBe(true);
    expect(canTransition('emitida', 'confirmada')).toBe(true);
  });

  it('se puede anular lo emitido y lo confirmado, pero no un borrador', () => {
    expect(canTransition('emitida', 'anulada')).toBe(true);
    expect(canTransition('confirmada', 'anulada')).toBe(true);
    // Un borrador no se anula: se elimina, porque nunca salió.
    expect(canTransition('borrador', 'anulada')).toBe(false);
  });

  it('una emitida no vuelve a borrador: se anula y se emite otra', () => {
    expect(canTransition('emitida', 'borrador')).toBe(false);
    expect(canTransition('confirmada', 'borrador')).toBe(false);
  });

  it('lo anulado es terminal', () => {
    expect(canTransition('anulada', 'emitida')).toBe(false);
    expect(canTransition('anulada', 'confirmada')).toBe(false);
  });

  it('sólo el borrador se edita y se elimina', () => {
    expect(isEditable('borrador')).toBe(true);
    expect(isEditable('emitida')).toBe(false);
    expect(isEditable('confirmada')).toBe(false);
    expect(isDeletable('borrador')).toBe(true);
    expect(isDeletable('emitida')).toBe(false);
  });

  it('el error explica por qué, no sólo que no se puede', () => {
    expect(transitionError('confirmada', 'emitida')).toContain('anularla y emitir otra');
    expect(transitionError('anulada', 'confirmada')).toContain('anulada');
    expect(transitionError('emitida', 'emitida')).toContain('ya está');
  });
});
