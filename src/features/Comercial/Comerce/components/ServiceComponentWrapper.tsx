import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import {
  fechAllCustomers,
  fetchAllContractorSectorBySectorIds,
  fetchAllSectors,
  fetchAreasWithProvinces,
} from '../../../Empresa/Clientes/actions/create';
import { fetchServiceItems } from '../../../Empresa/Clientes/actions/items';
import { fetchMeasureUnits } from '../../../Empresa/Clientes/actions/meassure';
import { fetchServices } from '../../../Empresa/Clientes/actions/service';
import ServiceComponent from '../../../Empresa/Clientes/components/Services/ServiceComponent';

export default async function ServiceComponentWrapper() {
  const cookiesStore = await cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Fetch data
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const areas = await fetchAreasWithProvinces();
  const sectors = await fetchAllSectors();
  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);
  const services = await fetchServices();
  const serviceItems = await fetchServiceItems('');
  const measure_units = await fetchMeasureUnits();

  // Get cookies
  const savedCustomersFiltersServiceTable = cookiesStore.get('services-table-filters')?.value;

  return (
    <Card className="p-6">
      <ServiceComponent
        savedFilter={savedCustomersFiltersServiceTable ? JSON.parse(savedCustomersFiltersServiceTable) : []}
        customers={contractorCompanies || []}
        areas={areas || []}
        sectors={contractorSectors}
        measure_units={measure_units || []}
        services={services || []}
        items={serviceItems || []}
        company_id={actualCompany || ''}
        itemsList={serviceItems || []}
        measureUnitsList={measure_units || []}
      />
    </Card>
  );
}
