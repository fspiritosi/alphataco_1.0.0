import { describe, expect, it } from 'vitest';
import { MIN_APPROVAL_DESCRIPTION_LENGTH } from '../constants/approval';
import {
  MAINTENANCE_REQUEST_STATUSES,
  isValidApprovalDescription,
  isValidRequestTransition,
  normalizeApprovalDescription,
  resolveApprovalOutcome,
  type ApprovalOutcomeInput,
} from './request-approval';

function outcome(overrides: Partial<ApprovalOutcomeInput> = {}) {
  return resolveApprovalOutcome({
    approvedItemIds: [],
    propagatingItemIds: [],
    rejectedItems: [],
    ...overrides,
  });
}

describe('isValidRequestTransition', () => {
  it('permite pending_approval → approved', () => {
    expect(isValidRequestTransition('pending_approval', 'approved')).toBe(true);
  });

  it('permite pending_approval → rejected', () => {
    expect(isValidRequestTransition('pending_approval', 'rejected')).toBe(true);
  });

  it('rechaza aprobar una solicitud ya aprobada', () => {
    expect(isValidRequestTransition('approved', 'approved')).toBe(false);
  });

  it('rechaza reabrir una solicitud rechazada', () => {
    expect(isValidRequestTransition('rejected', 'pending_approval')).toBe(false);
  });

  it('rechaza un estado desconocido', () => {
    expect(isValidRequestTransition('inventado', 'approved')).toBe(false);
    expect(isValidRequestTransition('pending_approval', 'inventado')).toBe(false);
  });

  it('expone los estados conocidos', () => {
    expect([...MAINTENANCE_REQUEST_STATUSES]).toEqual(['pending_approval', 'approved', 'rejected']);
  });
});

describe('normalizeApprovalDescription / isValidApprovalDescription', () => {
  it('recorta los espacios y devuelve null cuando queda vacía', () => {
    expect(normalizeApprovalDescription('   ')).toBeNull();
    expect(normalizeApprovalDescription(undefined)).toBeNull();
    expect(normalizeApprovalDescription('  hola  ')).toBe('hola');
  });

  it('exige la longitud mínima', () => {
    expect(isValidApprovalDescription('x'.repeat(MIN_APPROVAL_DESCRIPTION_LENGTH - 1))).toBe(false);
    expect(isValidApprovalDescription('x'.repeat(MIN_APPROVAL_DESCRIPTION_LENGTH))).toBe(true);
    expect(isValidApprovalDescription(null)).toBe(false);
  });

  it('valida sobre el texto recortado', () => {
    expect(isValidApprovalDescription(`   ${'x'.repeat(MIN_APPROVAL_DESCRIPTION_LENGTH - 1)}   `)).toBe(false);
  });
});

describe('resolveApprovalOutcome', () => {
  it('crea el pedido cuando hay al menos un item aprobado propagable', () => {
    const result = outcome({ approvedItemIds: ['a', 'b'], propagatingItemIds: ['a'] });

    expect(result.willCreateOrder).toBe(true);
    expect(result.requestStatus).toBe('approved');
    expect(result.orderItemIds).toEqual(['a']);
    expect(result.skippedItemIds).toEqual(['b']);
    expect(result.rejectionReason).toBeNull();
  });

  it('cierra la solicitud como rechazada si ningún aprobado propaga y hubo rechazos', () => {
    const result = outcome({
      approvedItemIds: ['a'],
      propagatingItemIds: [],
      rejectedItems: [{ itemId: 'r1', reason: 'No corresponde' }],
    });

    expect(result.willCreateOrder).toBe(false);
    expect(result.requestStatus).toBe('rejected');
    expect(result.rejectionReason).toBe('No corresponde');
  });

  it('junta los motivos de rechazo sin duplicar ni dejar vacíos', () => {
    const result = outcome({
      rejectedItems: [
        { itemId: '1', reason: ' Sin stock ' },
        { itemId: '2', reason: 'Sin stock' },
        { itemId: '3', reason: '  ' },
        { itemId: '4', reason: 'Duplicado' },
      ],
    });

    expect(result.rejectionReason).toBe('Sin stock; Duplicado');
  });

  it('deja la solicitud aprobada (sin pedido) cuando no propaga nada y tampoco hubo rechazos', () => {
    const result = outcome({ approvedItemIds: ['a'], propagatingItemIds: [] });

    expect(result.willCreateOrder).toBe(false);
    expect(result.requestStatus).toBe('approved');
    expect(result.rejectionReason).toBeNull();
  });

  it('exige descripción sólo cuando se va a crear el pedido', () => {
    expect(outcome({ approvedItemIds: ['a'], propagatingItemIds: ['a'] }).requiresDescription).toBe(true);
    expect(outcome({ rejectedItems: [{ itemId: 'r', reason: 'no' }] }).requiresDescription).toBe(false);
  });

  it('ignora ids propagables que no están entre los aprobados', () => {
    const result = outcome({ approvedItemIds: ['a'], propagatingItemIds: ['a', 'zz'] });

    expect(result.orderItemIds).toEqual(['a']);
  });

  it('una aprobación preventiva siempre genera pedido y exige descripción', () => {
    const result = outcome({ preventiveApproval: true });

    expect(result.willCreateOrder).toBe(true);
    expect(result.requiresDescription).toBe(true);
    expect(result.requestStatus).toBe('approved');
  });
});
