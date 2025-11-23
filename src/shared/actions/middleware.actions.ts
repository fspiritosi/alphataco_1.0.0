import { supabaseServer } from '@/lib/supabase/server';

export async function getUserProfile(email: string) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from('profile')
    .select(
      `
    id, email, role,
    company(id),
    share_company_users(company_id)
  `
    )
    .eq('email', email)
    .single();

  if (!data) return null;

  return data;
}
