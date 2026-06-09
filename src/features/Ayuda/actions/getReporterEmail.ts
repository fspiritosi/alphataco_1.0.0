'use server';

import { supabaseServer } from '@/lib/supabase/server';
import type { ReporterIdentity } from '../types';

export async function getReporterEmail(): Promise<ReporterIdentity | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstname = typeof meta.firstname === 'string' ? meta.firstname : null;
  const lastname = typeof meta.lastname === 'string' ? meta.lastname : null;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name : null;

  let name: string | null = null;
  if (firstname && lastname) name = `${firstname} ${lastname}`;
  else if (fullName) name = fullName;
  else if (firstname) name = firstname;

  return { email: user.email, name, userId: user.id };
}
