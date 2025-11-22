import DocumentacionComponent from '@/features/Documentacion/DocumentacionComponent';

export const metadata = {
  title: 'Documentos | GH Gestión',
  description: 'Gestión de documentos de empleados, equipos y empresa',
};

export default function DocumentosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <DocumentacionComponent searchParams={searchParams} />;
}
