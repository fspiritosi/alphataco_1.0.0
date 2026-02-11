import { getOperatorContext } from '@/features/OperatorPanel/actions/actionsServer';
import { OperatorHeader } from '@/features/OperatorPanel/components/OperatorHeader';
import { redirect } from 'next/navigation';
import { OperatorLayoutProvider } from '../operator-layout-provider';

export const metadata = {
  title: 'Panel de Operario - Taller',
};

export default async function OperatorPanelLayout({ children }: { children: React.ReactNode }) {
  const context = await getOperatorContext();

  if (!context) {
    redirect('/operator/login');
  }

  return (
    <OperatorLayoutProvider context={context}>
      <div className="min-h-dvh bg-background flex flex-col">
        <OperatorHeader />
        <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">{children}</main>
      </div>
    </OperatorLayoutProvider>
  );
}
