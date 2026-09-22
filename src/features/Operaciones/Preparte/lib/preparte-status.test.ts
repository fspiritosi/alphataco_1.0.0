import { describe, expect, it } from 'vitest';
import {
  BULK_EDITABLE_STATUSES,
  canBulkConfirm,
  canBulkEdit,
  canTransition,
  isFinalStatus,
  PREPARTE_STATUSES,
  type PreparteStatus,
} from './preparte-status';

describe('canTransition', () => {
  it('permite pasar de pendiente a cualquier estado de cierre', () => {
    for (const to of ['confirmado', 'rechazado', 'cancelado', 'reprogramado', 'vencido'] as PreparteStatus[]) {
      expect(canTransition('pendiente', to)).toBe(true);
    }
  });

  it('permite cerrar un reprogramado igual que un pendiente', () => {
    expect(canTransition('reprogramado', 'confirmado')).toBe(true);
    expect(canTransition('reprogramado', 'cancelado')).toBe(true);
  });

  it('permite confirmar un vencido (se confirma con fecha nueva y queda vencido)', () => {
    expect(canTransition('vencido', 'confirmado')).toBe(true);
  });

  it('no permite salir de un estado final', () => {
    expect(canTransition('confirmado', 'pendiente')).toBe(false);
    expect(canTransition('cancelado', 'confirmado')).toBe(false);
    expect(canTransition('rechazado', 'pendiente')).toBe(false);
  });

  it('no permite volver a pendiente desde ningún estado', () => {
    for (const from of PREPARTE_STATUSES) {
      expect(canTransition(from, 'pendiente')).toBe(false);
    }
  });

  it('no considera transición quedarse en el mismo estado', () => {
    expect(canTransition('pendiente', 'pendiente')).toBe(false);
  });
});

describe('isFinalStatus', () => {
  it('marca confirmado, cancelado y rechazado como finales', () => {
    expect(isFinalStatus('confirmado')).toBe(true);
    expect(isFinalStatus('cancelado')).toBe(true);
    expect(isFinalStatus('rechazado')).toBe(true);
  });

  it('no marca pendiente, reprogramado ni vencido como finales', () => {
    expect(isFinalStatus('pendiente')).toBe(false);
    expect(isFinalStatus('reprogramado')).toBe(false);
    expect(isFinalStatus('vencido')).toBe(false);
  });
});

describe('canBulkConfirm / canBulkEdit', () => {
  it('solo permite el masivo sobre pendiente y reprogramado', () => {
    expect(BULK_EDITABLE_STATUSES).toEqual(['pendiente', 'reprogramado']);
    expect(canBulkConfirm('pendiente')).toBe(true);
    expect(canBulkConfirm('reprogramado')).toBe(true);
    expect(canBulkEdit('pendiente')).toBe(true);
    expect(canBulkEdit('reprogramado')).toBe(true);
  });

  it('excluye del masivo los estados finales y el vencido', () => {
    for (const status of ['confirmado', 'cancelado', 'rechazado', 'vencido'] as PreparteStatus[]) {
      expect(canBulkConfirm(status)).toBe(false);
      expect(canBulkEdit(status)).toBe(false);
    }
  });

  it('trata el estado ausente (null) como no elegible', () => {
    expect(canBulkConfirm(null)).toBe(false);
    expect(canBulkEdit(null)).toBe(false);
  });
});
