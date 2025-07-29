import {
  fetchAllActivesEmployees,
  fetchAllEmployees,
  fetchAllEquipment,
  fetchServiceItems,
} from '@/app/server/GET/actions';
import { cn } from '@/lib/utils';
import { cookies } from 'next/headers';
import BackButton from '../../../../../../components/BackButton';
import CustomerComponent from '../../../../../../components/CustomerComponent';

export default async function CustomerFormAction({ searchParams, params }: { searchParams: any; params: any }) {
  const equipment = await fetchAllEquipment();
  const items = await fetchServiceItems(searchParams.actual, searchParams.user, searchParams.service);
  const employees = await fetchAllEmployees();
  const services = await fetchAllActivesEmployees();
  const filteredServices = services
    .filter((service: any) => service.customer_id?.toString() === searchParams.id && service.is_active === true)
    .map((service: any) => ({
      id: service.id,
      service_name: service.firstname + ' ' + service.lastname,
      is_active: service.is_active,
      service_start: service.date_of_admission,
      service_validity: service.termination_date || '',
    }));
  //console.log(items, employees, filteredServices);
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('equipment-table-equipment')?.value;
  const savedFilters = cookiesStore.get('equipment-table-equipment-filters')?.value;
  return (
    <section className="grid grid-cols-2 xl:grid-cols-2 gap-2 py-4 justify-start">
      <div className="flex gap-2 col-start-2 justify-end mr-6">
        <BackButton />
      </div>

      <div
        className={cn(
          'col-span-6 flex flex-col justify-between overflow-hidden',
          searchParams.action === 'new' && 'col-span-8'
        )}
      >
        <CustomerComponent
          equipment={equipment}
          id={searchParams.id}
          items={items}
          employees={employees}
          services={filteredServices}
          savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
          savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        />
        <div></div>
      </div>
    </section>
  );
}
