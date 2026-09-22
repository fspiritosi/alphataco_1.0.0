import { fetchCustomFormById } from '@/features/Formularios/actions/form-actions';
import { SubmitCustomForm } from '@/features/Formularios/components/forms/SubmitCustomForm';

async function page({ searchParams }: { searchParams: Promise<{ formid: string }> }) {
  const { formid } = await searchParams;
  const [dataForm] = await fetchCustomFormById(formid);

  return (
    <div>
      <SubmitCustomForm campos={[dataForm]} />
    </div>
  );
}

export default page;
