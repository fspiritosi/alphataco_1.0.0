import { getReporterEmail } from '@/features/Ayuda/actions/getReporterEmail';
import { getMyTicketsWithUnread, getSupportTicketById } from '@/features/Ayuda/actions/support-tickets';
import { HelpCenter } from '@/features/Ayuda/components/HelpCenter';
import { getCompanyName } from '@/features/Empresa/General/actions/company.server';
import { checkPermissionServer } from '@/features/Permissions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

interface SearchParams {
  ticket?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function HelpPage({ searchParams }: Props) {
  const canView = await checkPermissionServer('ayuda', 'tickets', 'view');
  if (!canView) redirect('/dashboard');

  const params = await searchParams;
  const rawId = params.ticket ? Number(params.ticket) : null;
  const ticketId = rawId != null && Number.isFinite(rawId) ? rawId : null;

  const [initialTickets, initialTicket, reporter] = await Promise.all([
    getMyTicketsWithUnread(),
    ticketId != null ? getSupportTicketById(ticketId) : Promise.resolve(null),
    getReporterEmail(),
  ]);

  const currentUserEmail = reporter?.email ?? '';
  const currentUserName = reporter?.name ?? reporter?.email ?? 'Usuario';

  return (
    <HelpCenter
      initialTickets={initialTickets}
      initialTicket={initialTicket}
      initialTicketId={ticketId}
      currentUserEmail={currentUserEmail}
      currentUserName={currentUserName}
    />
  );
}
