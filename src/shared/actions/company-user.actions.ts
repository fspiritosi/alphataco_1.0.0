'use server';

import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';

export const setNewCompanyUserMetadata = async (company_id: string) => {
  const supabase = await adminSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.company !== company_id && company_id) {
    const { data, error } = await supabase.auth.admin.updateUserById(user?.id || '', {
      app_metadata: {
        company: company_id,
      },
    });

    if (error) {
      // console.error('Error updating user metadata:', error);
      return;
    }
  }

  return;
};

export const fetchCurrentUser = async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};
