import { TabsManagerServer } from '@/features/TabsManager';
import { supabaseServer } from '@/lib/supabase/server';
import { CompanyDocumentsType } from '@/store/loggedUser';
import { Calendar, FileArchive } from 'lucide-react';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import EmpresaMensualesWrapper from './components/EmpresaMensualesWrapper';
import EmpresaPermanentesWrapper from './components/EmpresaPermanentesWrapper';

export default async function DocumentosEmpresaTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Fetch company documents data
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  let { data: documents_company } = await supabase
    .from('documents_company')
    .select('*,id_document_types(*),user_id(*)')
    .eq('applies', actualCompany || '');

  // Get user role for filtering private documents if necessary
  const { data: userShared } = await supabase
    .from('share_company_users')
    .select('*')
    .eq('profile_id', user?.data?.user?.id || '');
  const role: string | null = userShared?.[0]?.role || null;

  // Type the data and filter if needed based on role
  const typedDataCompany: CompanyDocumentsType[] | null = documents_company as CompanyDocumentsType[] | null;
  const companyData =
    role === 'Invitado' ? typedDataCompany?.filter((e) => !e.id_document_types.private) : typedDataCompany;

  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="empresa-permanentes"
      tabs={[
        {
          value: 'empresa-permanentes',
          label: (
            <span className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Documentos Permanentes
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'empresa-permanentes',
          content: (
            <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
              <EmpresaPermanentesWrapper companyData={companyData || []} />
            </Suspense>
          ),
        },
        {
          value: 'empresa-mensuales',
          label: (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Documentos Mensuales
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'empresa-mensuales',
          content: (
            <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
              <EmpresaMensualesWrapper companyData={companyData || []} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
