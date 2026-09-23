import { getOperatorContext } from '@/features/OperatorPanel/actions/session.server';
import { redirect } from 'next/navigation';

export default async function OperatorRootPage() {
  const context = await getOperatorContext();

  if (context) {
    redirect('/operator/dashboard');
  }

  redirect('/operator/login');
}
