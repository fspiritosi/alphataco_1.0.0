import { getCompanyName } from '@/features/Empresa/General/actions/company.server';
import PurchasesComponent from '@/features/Purchases/PurchasesComponent';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value ?? (await getCompanyName())?.company_name;
  if (companyName) {
    return { title: `Compras | ${companyName}`, description: `Proveedores y solicitudes de compra de ${companyName}` };
  }
  return { title: 'Compras' };
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <PurchasesComponent searchParams={resolvedSearchParams} />;
}
