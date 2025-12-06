import DocumentacionComponent from '@/features/Documentacion/DocumentacionComponent';

export const metadata = {
  title: 'Documentos | GH Gestión',
  description: 'Gestión de documentos de empleados, equipos y empresa',
};

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <DocumentacionComponent searchParams={resolvedSearchParams} />;
}
