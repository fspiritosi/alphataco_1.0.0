import { fetchAllProvinces } from '@/app/server/GET/actions';
import { cookies } from 'next/headers';
import { fechAllCustomers, fetchAreasWithProvinces } from '../actions/create';
import CustomerTab from './customerTab';

export default async function CustomerTabWrapper() {
  const cookiesStore = cookies();

  // Fetch data
  const customers = await fechAllCustomers();
  const provinces = await fetchAllProvinces();
  const areas = await fetchAreasWithProvinces();

  // Get cookies
  const savedCustomersFiltersAreaTable = cookiesStore.get('areaTable-filters')?.value;

  return (
    <CustomerTab
      savedFilters={savedCustomersFiltersAreaTable ? JSON.parse(savedCustomersFiltersAreaTable) : []}
      customers={customers || []}
      provinces={provinces || []}
      areas={areas || []}
    />
  );
}
