import { describe, expect, it } from 'vitest';
import { toTerminationReason } from './termination-reason';

describe('toTerminationReason', () => {
  it('convierte la etiqueta de la UI al valor del enum de Prisma', () => {
    expect(toTerminationReason('Despido sin causa')).toBe('Despido_sin_causa');
    expect(toTerminationReason('Renuncia')).toBe('Renuncia');
    expect(toTerminationReason('Fin de contrato')).toBe('Fin_de_contrato');
  });

  it('acepta el valor del enum tal cual (idempotente)', () => {
    expect(toTerminationReason('Acuerdo_de_partes')).toBe('Acuerdo_de_partes');
  });

  it('vacío o undefined → null (sin motivo)', () => {
    expect(toTerminationReason(undefined)).toBeNull();
    expect(toTerminationReason('')).toBeNull();
  });

  it('un motivo desconocido lanza', () => {
    expect(() => toTerminationReason('Jubilación')).toThrow(/Motivo de baja inválido/);
  });
});
