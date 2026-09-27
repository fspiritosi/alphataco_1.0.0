import { Card } from '@/components/ui/card';
import { fetchAllProvinces } from '@/features/Comercial/actions/location-actions';
import { getAreasWithProvinces } from '@/features/Empresa/Clientes/actions/areas.server';
import { getCustomers } from '@/features/Empresa/Clientes/actions/customers.server';
import { getMeasureUnits } from '@/features/Empresa/Clientes/actions/measure-units.server';
import { getSectors } from '@/features/Empresa/Clientes/actions/sectors.server';
import { getCustomerServices } from '@/features/Empresa/Clientes/actions/services.server';
import { CustomersPanel } from '@/features/Empresa/Clientes/components/CustomersPanel';
import { cookies } from 'next/headers';

function readCookieJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default async function DataCustomersWrapper() {
  const cookiesStore = await cookies();

  // Las actions ya acotan a la empresa activa (getActiveCompanyId + withCompany).
  const [customers, areas, sectors, services, measureUnits, provinces] = await Promise.all([
    getCustomers(),
    getAreasWithProvinces(),
    getSectors(),
    getCustomerServices(),
    getMeasureUnits(),
    fetchAllProvinces(),
  ]);

  return (
    <Card className="p-6">
      <CustomersPanel
        customers={customers}
        services={services}
        areas={areas}
        sectors={sectors}
        measureUnits={measureUnits}
        provinces={provinces}
        listVisibility={readCookieJson(cookiesStore.get('customers-table')?.value, {})}
        listFilters={readCookieJson(cookiesStore.get('customers-table-filters')?.value, [])}
        preferences={{
          employeesVisibility: readCookieJson(cookiesStore.get('employees-table')?.value, {}),
          equipmentVisibility: readCookieJson(cookiesStore.get('equipment-table-equipment')?.value, {}),
          equipmentFilters: readCookieJson(cookiesStore.get('equipment-table-equipment-filters')?.value, []),
          servicesFilters: readCookieJson(cookiesStore.get('services-table-filters')?.value, []),
          servicesVisibility: readCookieJson(cookiesStore.get('services-table')?.value, {}),
          serviceItemsFilters: readCookieJson(cookiesStore.get('service-items-table-filters')?.value, []),
          serviceItemsVisibility: readCookieJson(cookiesStore.get('service-items-table')?.value, {}),
          areasFilters: readCookieJson(cookiesStore.get('areaTable-filters')?.value, []),
        }}
      />
    </Card>
  );
}
