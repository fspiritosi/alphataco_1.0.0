import { ClothingLayoutProvider } from '@/app/clothing/clothing-layout-provider';
import { clothingLogout, getClothingOperatorContext } from '@/features/Clothing/actions/actionsServer';
import { redirect } from 'next/navigation';
import { ClothingPanelHeader } from './ClothingPanelHeader';

export const metadata = {
  title: 'Entrega de Indumentaria',
};

export default async function ClothingPanelLayout({ children }: { children: React.ReactNode }) {
  const context = await getClothingOperatorContext();

  if (!context) {
    redirect('/clothing/login');
  }

  return (
    <ClothingLayoutProvider context={context}>
      <div className="min-h-dvh bg-background flex flex-col">
        <ClothingPanelHeader employeeName={context.employeeName} logoutAction={clothingLogout} />
        <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">{children}</main>
      </div>
    </ClothingLayoutProvider>
  );
}
