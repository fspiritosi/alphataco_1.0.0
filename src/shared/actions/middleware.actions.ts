import { supabaseServer } from '@/lib/supabase/server';

export async function getUserProfile() {
  const supabase = supabaseServer();
  const session = await supabase.auth.getSession();
  const { data } = await supabase
    .from('profile')
    .select(
      `
    id, email, role,
    company(id),
    share_company_users(company_id, role)
  `
    )
    .eq('email', session.data.session?.user.email || '')
    .single();

  return data;
}
