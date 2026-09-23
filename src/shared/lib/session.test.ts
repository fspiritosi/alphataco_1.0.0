import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const getSession = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/auth', () => ({ auth: { api: { getSession } } }));

import {
  getSessionCompanyClaim,
  getSessionEmployeeIdClaim,
  getSessionUser,
  getSessionUserId,
  isSessionAnonymous,
} from './session';

/** Forma mínima de lo que devuelve `auth.api.getSession()`. */
function mockSession(user: Record<string, unknown> | null, session: Record<string, unknown> = {}) {
  getSession.mockResolvedValue(user ? { user, session: { token: 'tok', ...session } } : null);
}

describe('session', () => {
  it('getSessionUserId devuelve user.id (credential_id) y null sin sesión', async () => {
    mockSession({ id: 'u-1', email: 'a@b.c' });
    expect(await getSessionUserId()).toBe('u-1');
    mockSession(null);
    expect(await getSessionUserId()).toBeNull();
  });

  it('getSessionUser devuelve { id, email } con email null si falta', async () => {
    mockSession({ id: 'u-1', email: 'a@b.c' });
    expect(await getSessionUser()).toEqual({ id: 'u-1', email: 'a@b.c' });
    mockSession({ id: 'u-2' });
    expect(await getSessionUser()).toEqual({ id: 'u-2', email: null });
    mockSession(null);
    expect(await getSessionUser()).toBeNull();
  });

  it('getSessionCompanyClaim lee el claim de la SESIÓN sólo si es string no vacío', async () => {
    mockSession({ id: 'u-1' }, { company: 'c-1' });
    expect(await getSessionCompanyClaim()).toBe('c-1');
    mockSession({ id: 'u-1' }, { company: '' });
    expect(await getSessionCompanyClaim()).toBeNull();
    mockSession({ id: 'u-1' }, {});
    expect(await getSessionCompanyClaim()).toBeNull();
  });

  it('getSessionEmployeeIdClaim lee employeeId de la sesión', async () => {
    mockSession({ id: 'u-1' }, { employeeId: 'emp-1' });
    expect(await getSessionEmployeeIdClaim()).toBe('emp-1');
    mockSession({ id: 'u-1' }, {});
    expect(await getSessionEmployeeIdClaim()).toBeNull();
  });

  /**
   * El default cambió respecto de Supabase (`user?.is_anonymous ?? true`): de esta función
   * depende el corte de seguridad de `completeMaintenanceEmployeeAnonymousSession()`, así que
   * sin sesión tiene que decir "no es anónima" y hacer que el guarda rechace.
   */
  it('isSessionAnonymous falla CERRADO: sin sesión devuelve false', async () => {
    mockSession({ id: 'u-1', isAnonymous: true });
    expect(await isSessionAnonymous()).toBe(true);
    mockSession({ id: 'u-1', isAnonymous: false });
    expect(await isSessionAnonymous()).toBe(false);
    mockSession({ id: 'u-1' });
    expect(await isSessionAnonymous()).toBe(false);
    mockSession(null);
    expect(await isSessionAnonymous()).toBe(false);
  });
});
