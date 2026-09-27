import { Skeleton } from '@/components/ui/skeleton';
import { fetchAllProvinces } from '@/features/Comercial/actions/location-actions';
import { getAreasWithProvinces } from '@/features/Empresa/Clientes/actions/areas.server';
import { getCustomerById } from '@/features/Empresa/Clientes/actions/customers.server';
import { getMeasureUnits } from '@/features/Empresa/Clientes/actions/measure-units.server';
import { getSectors } from '@/features/Empresa/Clientes/actions/sectors.server';
import { getCustomerServices } from '@/features/Empresa/Clientes/actions/services.server';
import CustomerComponent from '@/features/Empresa/Clientes/components/CustomerComponent';
import { cn } from '@/lib/utils';
import BackButton from '@/shared/components/common/BackButton';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

interface PageProps {
  searchParams: Promise<{ id?: string; action?: string }>;
}

export default async function CustomerFormAction({ searchParams }: PageProps) {
  const { id, action } = await searchParams;
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get('equipment-table-equipment')?.value;
  const savedFilters = cookiesStore.get('equipment-table-equipment-filters')?.value;

  const [customer, services, areas, sectors, measureUnits, provinces] = await Promise.all([
    id ? getCustomerById(id) : Promise.resolve(null),
    getCustomerServices(),
    getAreasWithProvinces(),
    getSectors(),
    getMeasureUnits(),
    fetchAllProvinces(),
  ]);

  return (
    <section className="grid grid-cols-2 xl:grid-cols-2 gap-2 py-4 justify-start">
      <div className="flex gap-2 col-start-2 justify-end mr-6">
        <BackButton />
      </div>

      <div className={cn('col-span-6 flex flex-col justify-between overflow-hidden', action === 'new' && 'col-span-8')}>
        <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
          <CustomerComponent
            customer={customer}
            services={services}
            areas={areas}
            sectors={sectors}
            measureUnits={measureUnits}
            provinces={provinces}
            savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
            savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
          />
        </Suspense>
      </div>
    </section>
  );
}
