import ContactSection, { type ContactSectionSearchParams } from '@/features/Empresa/Contactos/components/ContactSection';

export default async function ContactActionPage({
  searchParams,
}: {
  searchParams: Promise<ContactSectionSearchParams>;
}) {
  return <ContactSection searchParams={searchParams} backButtonAlign="end" skeletonClassName="h-64" />;
}
