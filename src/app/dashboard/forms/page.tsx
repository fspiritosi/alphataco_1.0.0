import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import FormulariosComponent from '@/features/Formularios/FormulariosComponent';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Formularios | ${companyName}`,
      description: `Gestión de formularios y checklists de ${companyName}`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Formularios | ${actualCompany.company_name}`,
        description: `Gestión de formularios y checklists de ${actualCompany.company_name}`,
      };
    }
  }
}

export default async function FormulariosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <FormulariosComponent searchParams={resolvedSearchParams} />;
}
