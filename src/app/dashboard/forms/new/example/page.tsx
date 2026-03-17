import { SubmitCustomForm } from '@/features/Formularios/components/forms/SubmitCustomForm';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

async function page({ searchParams }: { searchParams: { formid: string } }) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp');
  const form = searchParams.formid;
  const { data, error } = await supabase
    .from('custom_form')
    .select('*')
    .eq('company_id', company_id?.value || '');

  const dataForm = data?.find((e) => e.id === form);
  return (
    <div>
      <SubmitCustomForm campos={[dataForm]} />
    </div>
  );
}

export default page;
