import { ClothingLoginForm } from '@/features/Clothing/ClothingDelivery/components/ClothingLoginForm';
import { getClothingOperatorContext } from '@/features/Clothing/actions/actionsServer';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Iniciar Sesion - Entrega de Indumentaria',
};

export default async function ClothingLoginPage() {
  // If already authenticated with a valid clothing context, redirect to delivery
  const context = await getClothingOperatorContext();

  if (context) {
    redirect('/clothing/delivery');
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ClothingLoginForm />
      </div>
    </div>
  );
}
