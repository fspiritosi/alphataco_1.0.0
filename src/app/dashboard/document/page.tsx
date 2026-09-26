import DocumentacionComponent from '@/features/Documentacion/DocumentacionComponent';
import { BRAND_NAME } from '@/shared/lib/branding';

export const metadata = {
  title: `Documentos | ${BRAND_NAME}`,
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
