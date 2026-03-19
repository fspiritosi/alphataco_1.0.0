import { getClothingOperatorContext } from '@/features/Clothing/actions/actionsServer';
import { redirect } from 'next/navigation';

export default async function ClothingRootPage() {
  const context = await getClothingOperatorContext();

  if (context) {
    redirect('/clothing/delivery');
  }

  redirect('/clothing/login');
}
