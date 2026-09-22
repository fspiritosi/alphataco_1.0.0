import { Card } from '@/components/ui/card';
import { fetchAllProvinces } from '@/features/Comercial/actions/location-actions';
import { getAreasWithProvinces } from '@/features/Empresa/Clientes/actions/areas.server';
import { getCustomers } from '@/features/Empresa/Clientes/actions/customers.server';
import CustomerTab from '@/features/Empresa/Clientes/components/customerTab';
import { cookies } from 'next/headers';

export default async function CustomerTabWrapper() {
  const cookiesStore = await cookies();

  const [customers, provinces, areas] = await Promise.all([getCustomers(), fetchAllProvinces(), getAreasWithProvinces()]);

  const savedCustomersFiltersAreaTable = cookiesStore.get('areaTable-filters')?.value;

  return (
    <Card className="p-6">
      <CustomerTab
        savedFilters={savedCustomersFiltersAreaTable ? JSON.parse(savedCustomersFiltersAreaTable) : []}
        customers={customers}
        provinces={provinces.map((province) => ({ id: Number(province.id), name: province.name }))}
        areas={areas}
      />
    </Card>
  );
}
