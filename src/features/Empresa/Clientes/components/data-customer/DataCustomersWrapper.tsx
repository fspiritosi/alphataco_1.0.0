import { fetchAllEmployeesOnlyName } from '@/shared/actions/employees.actions';
import { cookies } from 'next/headers';
import {
  fechAllCustomers,
  fetchAllContractorSectorBySectorIds,
  fetchAllSectors,
  fetchAreasWithProvinces,
} from '../../actions/create';
import { fetchMeasureUnits } from '../../actions/meassure';
import { fetchServices } from '../../actions/service';
import { columnsCustomers } from '../columns';
import { DataCustomers } from '../data-customer';

export default async function DataCustomersWrapper() {
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const areas = await fetchAreasWithProvinces();
  const sectors = await fetchAllSectors();
  // console.log(sectors, 'sectors');
  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);

  const services = await fetchServices(actualCompany || '');
  const employees = await fetchAllEmployeesOnlyName();
  const measure_units = await fetchMeasureUnits();

  // Get cookies
  const savedCustomers = cookiesStore.get('customers-table')?.value;
  const savedCustomersFilters = cookiesStore.get('customers-table-filters')?.value;
  const savedCustomersFiltersEquipmentTable = cookiesStore.get('equipment-table-equipment-filters')?.value;
  const savedVisibilityEquipmentTable = cookiesStore.get('equipment-table-equipment')?.value;
  const savedCustomersFiltersServiceTable = cookiesStore.get('services-table-filters')?.value;

  return (
    <DataCustomers
      savedVisibilityEquipment={savedVisibilityEquipmentTable ? JSON.parse(savedVisibilityEquipmentTable) : []}
      savedFilters={savedCustomersFilters ? JSON.parse(savedCustomersFilters) : []}
      savedFiltersEquipmentTable={
        savedCustomersFiltersEquipmentTable ? JSON.parse(savedCustomersFiltersEquipmentTable) : []
      }
      savedFiltersServiceTable={savedCustomersFiltersServiceTable ? JSON.parse(savedCustomersFiltersServiceTable) : []}
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
  );
}
