import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ supabaseServer: vi.fn() }));

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getActiveCompanyId, NoActiveCompanyError } from './tenant';

describe('getActiveCompanyId', () => {
  it('prefiere app_metadata.company del JWT', async () => {
    vi.mocked(supabaseServer).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { app_metadata: { company: 'c-jwt' } } } }) },
    } as unknown as Awaited<ReturnType<typeof supabaseServer>>);
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: 'c-cookie' }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    expect(await getActiveCompanyId()).toBe('c-jwt');
  });

  it('cae a la cookie actualComp si el JWT no trae empresa', async () => {
    vi.mocked(supabaseServer).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { app_metadata: {} } } }) },
    } as unknown as Awaited<ReturnType<typeof supabaseServer>>);
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: 'c-cookie' }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    expect(await getActiveCompanyId()).toBe('c-cookie');
  });

  it('lanza si no hay empresa', async () => {
    vi.mocked(supabaseServer).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { app_metadata: {} } } }) },
    } as unknown as Awaited<ReturnType<typeof supabaseServer>>);
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getActiveCompanyId()).rejects.toBeInstanceOf(NoActiveCompanyError);
  });
});
