import { DocumentDetailSection } from '@/features/Documentacion/DetalleDocumento/DocumentDetailSection';

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resource?: string; [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  return <DocumentDetailSection documentId={id} searchParams={searchParams} />;
}
