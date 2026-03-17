import { supabaseBrowser } from '@/lib/supabase/browser';
import { FormData } from '@/shared/types/legacy';
import { cookies } from 'next/headers';
import FormCardContainer from './FormCardContainer';

const getForms = async (company_id: string) => {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('custom_form')
    .select('*,form_answers(form_id)')
    .eq('company_id', company_id);
  if (error) {
    console.error(error);
  }
  if (data) {
    return data;
  }
};

export async function FormCustomContainer({
  employees,
  documents,
  equipment,
  company,
  showAnswers,
}: {
  employees?: boolean;
  documents?: boolean;
  equipment?: boolean;
  company?: boolean;
  showAnswers?: boolean;
}) {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp');
  const createdFormsState = (await getForms(company_id?.value as string)) as FormData[] | undefined;
  return (
    <FormCardContainer
      form={createdFormsState || []}
      employees={employees}
      documents={documents}
      equipment={equipment}
      company={company}
      showAnswers={showAnswers}
    />
  );
}
