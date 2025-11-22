import { fetchAllProvinces } from '@/app/server/GET/actions';
import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { fechAllCustomers, fetchAreasWithProvinces } from '../../../Empresa/Clientes/actions/create';
import CustomerTab from '../../../Empresa/Clientes/components/customerTab';

export default async function CustomerTabWrapper() {
  const cookiesStore = cookies();

  // Fetch data
  const customers = await fechAllCustomers();
  const provinces = await fetchAllProvinces();
  const areas = await fetchAreasWithProvinces();

  // Get cookies
  const savedCustomersFiltersAreaTable = cookiesStore.get('areaTable-filters')?.value;

  return (
    <Card className="p-6">
      <CustomerTab
        savedFilters={savedCustomersFiltersAreaTable ? JSON.parse(savedCustomersFiltersAreaTable) : []}
        customers={customers || []}
        provinces={provinces || []}
        areas={areas || []}
      />
    </Card>
  );
}
