import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ supabaseServer: vi.fn() })); // P4: auth

import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { getSessionCompanyClaim, getSessionUser, getSessionUserId } from './session';

function mockUser(user: unknown) {
  vi.mocked(supabaseServer).mockResolvedValue({ // P4: auth
    auth: { getUser: async () => ({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof supabaseServer>>); // P4: auth
}

describe('session', () => {
  it('getSessionUserId devuelve user.id (credential_id) y null sin sesión', async () => {
    mockUser({ id: 'u-1', email: 'a@b.c', app_metadata: {} });
    expect(await getSessionUserId()).toBe('u-1');
    mockUser(null);
    expect(await getSessionUserId()).toBeNull();
  });

  it('getSessionUser devuelve { id, email } con email null si falta', async () => {
    mockUser({ id: 'u-1', email: 'a@b.c', app_metadata: {} });
    expect(await getSessionUser()).toEqual({ id: 'u-1', email: 'a@b.c' });
    mockUser({ id: 'u-2', app_metadata: {} });
    expect(await getSessionUser()).toEqual({ id: 'u-2', email: null });
    mockUser(null);
    expect(await getSessionUser()).toBeNull();
  });

  it('getSessionCompanyClaim lee app_metadata.company sólo si es string no vacío', async () => {
    mockUser({ id: 'u-1', app_metadata: { company: 'c-1' } });
    expect(await getSessionCompanyClaim()).toBe('c-1');
    mockUser({ id: 'u-1', app_metadata: { company: '' } });
    expect(await getSessionCompanyClaim()).toBeNull();
    mockUser({ id: 'u-1', app_metadata: {} });
    expect(await getSessionCompanyClaim()).toBeNull();
  });
});
