import ContactSection, { type ContactSectionSearchParams } from '@/features/Empresa/Contactos/components/ContactSection';

export default async function ContactPage({ searchParams }: { searchParams: Promise<ContactSectionSearchParams> }) {
  return <ContactSection searchParams={searchParams} backButtonAlign="start" skeletonClassName="h-[400px]" />;
}
