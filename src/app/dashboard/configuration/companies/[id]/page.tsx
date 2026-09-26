import EditCompanySection from '@/features/Empresa/General/components/EditCompanySection';

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCompanySection companyId={id} />;
}
