'use server';

import { getCurrentUserProfile } from '@/features/Layout/navbar/actions/actions.navbar';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
export const fetchCurrentCompany = async () => {
  'use server';
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  let company_id = cookieStore.get('actualComp')?.value;

  // Si no hay cookie, intentar obtener company_id desde app_metadata (contexto de maintenance)
  if (!company_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si estamos en contexto de maintenance, el company_id está en app_metadata
    if (user?.app_metadata?.company) {
      company_id = user.app_metadata.company as string;
    } else {
      // Intentar obtener desde el perfil del usuario (contexto normal)
      const userProfile = await getCurrentUserProfile();
      if (userProfile?.id) {
        const { allCompanies, sharedCompanies } = await fetchUserCompanies(userProfile.id);
        const firstCompany = allCompanies[0] || sharedCompanies[0];
        if (firstCompany?.id) {
          company_id = firstCompany.id;
        }
      }
    }
  }

  // Si aún no hay company_id, retornar null sin hacer query (evitar error de UUID vacío)
  if (!company_id || company_id.trim() === '') {
    return null;
  }

  const { data: company, error } = await supabase.from('company').select('*, city(id, name)').eq('id', company_id);

  if (error) {
    console.error('Error fetching company:', error);
    return null;
  }
  return company;
};

export const fetchUserCompanies = async (userId: string) => {
  const supabase = await supabaseServer();
  if (!userId) {
    return { sharedCompanies: [], allCompanies: [] };
  }

  // Obtener compañías compartidas
  const { data: sharedCompanies, error: sharedError } = await supabase
    .from('share_company_users')
    .select('company_id(*)')
    .eq('profile_id', userId)
    .returns<SharedCompanyWithCompany[]>();

  if (sharedError) {
    console.error('Error fetching shared companies:', sharedError);
    return { sharedCompanies: [], allCompanies: [] };
  }

  // Obtener compañías propias
  const { data: allCompanies, error: ownedError } = await supabase.from('company').select('*').eq('owner_id', userId);

  if (ownedError) {
    console.error('Error fetching owned companies:', ownedError);
    return { sharedCompanies: [], allCompanies: [] };
  }

  return {
    sharedCompanies: sharedCompanies?.map((sc) => sc.company_id) as Company[],
    allCompanies: allCompanies || [],
  };
};
