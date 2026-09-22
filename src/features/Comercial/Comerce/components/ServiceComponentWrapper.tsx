import { Card } from '@/components/ui/card';
import { getAreasWithProvinces } from '@/features/Empresa/Clientes/actions/areas.server';
import { getCustomers } from '@/features/Empresa/Clientes/actions/customers.server';
import { getMeasureUnits } from '@/features/Empresa/Clientes/actions/measure-units.server';
import { getSectorCustomers } from '@/features/Empresa/Clientes/actions/sectors.server';
import { getCustomerServices } from '@/features/Empresa/Clientes/actions/services.server';
import ServiceComponent from '@/features/Empresa/Clientes/components/Services/ServiceComponent';
import { cookies } from 'next/headers';

export default async function ServiceComponentWrapper() {
  const cookiesStore = await cookies();

  const [customers, areas, sectors, services, measureUnits] = await Promise.all([
    getCustomers(),
    getAreasWithProvinces(),
    getSectorCustomers(),
    getCustomerServices(),
    getMeasureUnits(),
  ]);

  const savedCustomersFiltersServiceTable = cookiesStore.get('services-table-filters')?.value;

  return (
    <Card className="p-6">
      <ServiceComponent
        savedFilter={savedCustomersFiltersServiceTable ? JSON.parse(savedCustomersFiltersServiceTable) : []}
        customers={customers}
        areas={areas}
        sectors={sectors}
        measureUnits={measureUnits}
        services={services}
      />
    </Card>
  );
}
