'use server';

import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { getActiveCompanyId } from '@/shared/lib/tenant';

/**
 * Obtiene el company_id del contexto actual.
 */
export const getServerCompanyId = async (): Promise<string> => {
  return getActiveCompanyId();
};

export const fetchCurrentCompany = async () => {
  const supabase = await supabaseServer();

  // Usar la función centralizada para obtener el company_id
  const company_id = await getServerCompanyId();

  const { data: company, error } = await supabase.from('company').select('*, city(id, name)').eq('id', company_id);

  if (error) {
    logger.error('Error fetching company:', { data: { error } });
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
    logger.error('Error fetching shared companies:', { data: { error: sharedError } });
    return { sharedCompanies: [], allCompanies: [] };
  }

  // Obtener compañías propias
  const { data: allCompanies, error: ownedError } = await supabase.from('company').select('*').eq('owner_id', userId);

  if (ownedError) {
    logger.error('Error fetching owned companies:', { data: { error: ownedError } });
    return { sharedCompanies: [], allCompanies: [] };
  }

  return {
    sharedCompanies: sharedCompanies?.map((sc) => sc.company_id) as Company[],
    allCompanies: allCompanies || [],
  };
};
