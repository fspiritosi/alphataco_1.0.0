import AyudaComponent from '@/features/Ayuda/AyudaComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/company.server';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Ayuda | ${companyName}`,
      description: `Centro de ayuda de ${companyName}`,
    };
  }
  const fetched = await getCompanyName();
  if (fetched) {
    return {
      title: `Ayuda | ${fetched.company_name}`,
      description: `Centro de ayuda de ${fetched.company_name}`,
    };
  }
  return { title: 'Ayuda' };
}

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <AyudaComponent searchParams={resolvedSearchParams} />;
}
