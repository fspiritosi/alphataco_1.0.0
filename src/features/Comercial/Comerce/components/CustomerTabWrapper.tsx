import { Card } from '@/components/ui/card';
import { fetchAllProvinces } from '@/features/Comercial/actions/location-actions';
import { cookies } from 'next/headers';
import { fechAllCustomers, fetchAreasWithProvinces } from '../../../Empresa/Clientes/actions/create';
import CustomerTab from '../../../Empresa/Clientes/components/customerTab';

export default async function CustomerTabWrapper() {
  const cookiesStore = await cookies();

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
