import { formatEmployeesForTable } from '@/features/Employees/Empleados/components/utils/utils';
import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { fetchAllEquipment } from '@/shared/actions/equipment.actions';
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

  // Fetch data
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const areas = await fetchAreasWithProvinces();
  const sectors = await fetchAllSectors();
  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);
  const services = await fetchServices(actualCompany || '');
  const measure_units = await fetchMeasureUnits();
  const employees = await fetchAllEmployees();
  const formattedEmployees = formatEmployeesForTable(employees);
  const equipments = await fetchAllEquipment();

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
      employees={formattedEmployees}
      equipments={equipments}
      services={services || []}
      areas={areas || []}
      sectors={contractorSectors || []}
      itemsList={[]}
      measureUnitsList={measure_units || []}
    />
  );
}
