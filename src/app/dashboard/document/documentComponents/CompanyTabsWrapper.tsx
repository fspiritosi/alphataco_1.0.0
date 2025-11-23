import { supabaseServer } from '@/lib/supabase/server';
import { CompanyDocumentsType } from '@/store/loggedUser';
import { cookies } from 'next/headers';
import CompanyTabs from './CompanyTabs';

async function CompanyTabsWrapper({ subtab, tabValue, path }: { subtab?: string; tabValue: string; path: string }) {
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Fetch company documents data
  let { data: documents_company } = await supabase
    .from('documents_company')
    .select('*,id_document_types(*),user_id(*)')
    .eq('applies', actualCompany || '');

  // Get user role for filtering private documents if necessary
  const { data: userShared } = await supabase
    .from('share_company_users')
    .select('*')
    .eq('profile_id', user?.data?.user?.id || '');
  // const role: string | null = userShared?.[0]?.role || null;

  // Type the data and filter if needed based on role
  const typedDataCompany: CompanyDocumentsType[] | null = documents_company as CompanyDocumentsType[] | null;
  const companyData = typedDataCompany;

  return <CompanyTabs path={path} tabValue={tabValue} subtab={subtab} companyData={companyData as any} />;
}

export default CompanyTabsWrapper;
