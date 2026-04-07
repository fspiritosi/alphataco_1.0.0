import AllDeliveriesList from '@/features/Clothing/AllDeliveries/AllDeliveriesList/AllDeliveriesList';
import { AllDeliveriesTableSkeleton } from '@/features/Clothing/AllDeliveries/AllDeliveriesList/fallback/AllDeliveriesTableSkeleton';
import { DeliveryPageClient } from '@/features/Clothing/ClothingDelivery/components/DeliveryPageClient';
import { Suspense } from 'react';

interface ClothingDeliveryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ClothingDeliveryPage({ searchParams }: ClothingDeliveryPageProps) {
  const resolvedSearchParams = await searchParams;
  const employeeId =
    typeof resolvedSearchParams.employee_id === 'string' ? resolvedSearchParams.employee_id : undefined;
  return (
    <DeliveryPageClient
      initialEmployeeId={employeeId}
      listSlot={
        <Suspense fallback={<AllDeliveriesTableSkeleton />}>
          <AllDeliveriesList searchParams={resolvedSearchParams} />
        </Suspense>
      }
    />
  );
}
