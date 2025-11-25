import { Card } from '@/components/ui/card';
import { fetchAllEmployeesOnlyName } from '@/shared/actions/employees.actions';
import { cookies } from 'next/headers';
import {
  fechAllCustomers,
  fetchAllContractorSectorBySectorIds,
  fetchAllSectors,
  fetchAreasWithProvinces,
} from '../../../Empresa/Clientes/actions/create';
import { fetchMeasureUnits } from '../../../Empresa/Clientes/actions/meassure';
import { fetchServices } from '../../../Empresa/Clientes/actions/service';
import { columnsCustomers } from '../../../Empresa/Clientes/components/columns';
import { DataCustomers } from '../../../Empresa/Clientes/components/data-customer';

export default async function DataCustomersWrapper() {
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Consultas que no dependen entre sí
  const [customers, areas, sectors, services, employees, measure_units] = await Promise.all([
    fechAllCustomers(),
    fetchAreasWithProvinces(),
    fetchAllSectors(),
    fetchServices(actualCompany || ''),
    fetchAllEmployeesOnlyName(),
    fetchMeasureUnits(),
  ]);

  // Esta consulta depende de sectors

  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);

  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);

  // Get cookies
  const savedCustomers = cookiesStore.get('customers-table')?.value;
  const savedCustomersFilters = cookiesStore.get('customers-table-filters')?.value;
  const savedCustomersFiltersEquipmentTable = cookiesStore.get('equipment-table-equipment-filters')?.value;
  const savedVisibilityEquipmentTable = cookiesStore.get('equipment-table-equipment')?.value;
  const savedCustomersFiltersServiceTable = cookiesStore.get('services-table-filters')?.value;

  return (
    <Card className="p-6">
      <DataCustomers
        savedVisibilityEquipment={savedVisibilityEquipmentTable ? JSON.parse(savedVisibilityEquipmentTable) : []}
        savedFilters={savedCustomersFilters ? JSON.parse(savedCustomersFilters) : []}
        savedFiltersEquipmentTable={
          savedCustomersFiltersEquipmentTable ? JSON.parse(savedCustomersFiltersEquipmentTable) : []
        }
        savedFiltersServiceTable={
          savedCustomersFiltersServiceTable ? JSON.parse(savedCustomersFiltersServiceTable) : []
        }
        columns={columnsCustomers}
        data={contractorCompanies || []}
        company_id={actualCompany || ''}
        savedCustomers={savedCustomers}
        allEmployees={employees.map((employee) => ({
          label: `${employee.lastname} ${employee.firstname}`,
          value: employee.id,
        }))}
        // equipmentsPromise={equipments}
        services={services || []}
        areas={areas || []}
        sectors={contractorSectors || []}
        itemsList={[]}
        measureUnitsList={measure_units || []}
      />
    </Card>
  );
}
