import { fetchAllProvinces } from '@/app/server/GET/actions';
import ViewcomponentInternal from '@/components/ViewComponentInternal';
import { buttonVariants } from '@/components/ui/button';
import { formatEmployeesForTable } from '@/features/Employees/Empleados/components/utils/utils';
import ServiceComponent from '@/features/Empresa/Clientes/components/Services/ServiceComponent';
import Contacts from '@/features/Empresa/Clientes/components/contacts/Contact';
import CustomerTab from '@/features/Empresa/Clientes/components/customerTab';
import CustomerEquipmentTab from '@/features/Empresa/Clientes/components/equipos/customerEquipmentTab';
import SectorTabs from '@/features/Empresa/Clientes/components/sector_clientes/sectorTabs';
import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { fetchAllEquipment } from '@/shared/actions/equipment.actions';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  fechAllCustomers,
  fetchAllContractorSectorBySectorIds,
  fetchAllSectors,
  fetchAreasWithProvinces,
  fetchEquipmentsCustomers,
} from './actions/create';
import { fetchServiceItems } from './actions/items';
import { fetchMeasureUnits } from './actions/meassure';
import { fetchServices } from './actions/service';
import { columnsCustomers } from './components/columns';
import { DataCustomers } from './components/data-customer';

async function ComercialTab({
  tabValue,
  subtab,
  localStorageName,
}: {
  localStorageName: string;
  subtab?: string;
  tabValue: string;
}) {
  const coockiesStore = cookies();
  const actualCompany = coockiesStore.get('actualComp')?.value;
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const provinces = await fetchAllProvinces();
  const areas = await fetchAreasWithProvinces();
  const sectors = await fetchAllSectors();
  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);

  const services = await fetchServices(actualCompany || '');
  const serviceItems = await fetchServiceItems();
  const measure_units = await fetchMeasureUnits();
  const equipmentsCustomers = await fetchEquipmentsCustomers();

  const savedCustomers = coockiesStore.get('customers-table')?.value;
  const savedCustomersFilters = coockiesStore.get('customers-table-filters')?.value;
  const savedCustomersFiltersEquipmentTable = coockiesStore.get('equipment-table-equipment-filters')?.value;
  const savedVisibilityEquipmentTable = coockiesStore.get('equipment-table-equipment')?.value;
  const savedCustomersFiltersServiceTable = coockiesStore.get('services-table-filters')?.value;
  const savedCustomersFiltersAreaTable = coockiesStore.get('areaTable-filters')?.value;
  const employees = await fetchAllEmployees();
  const formattedEmployees = formatEmployeesForTable(employees);
  const equipments = await fetchAllEquipment();
  const viewData = {
    defaultValue: subtab || 'customers',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'customers',
        name: 'Clientes',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Clientes',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <div>
              <DataCustomers
                savedVisibilityEquipment={
                  savedVisibilityEquipmentTable ? JSON.parse(savedVisibilityEquipmentTable) : []
                }
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
                employees={formattedEmployees}
                equipments={equipments}
                // Nuevas props para servicios
                services={services || []}
                areas={areas || []}
                sectors={contractorSectors || []}
                itemsList={[]}
                measureUnitsList={measure_units || []}
              />
            </div>
          ),
        },
      },
      {
        value: 'areas',
        name: 'Areas',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Areas',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <CustomerTab
              savedFilters={savedCustomersFiltersAreaTable ? JSON.parse(savedCustomersFiltersAreaTable) : []}
              customers={customers || []}
              provinces={provinces || []}
              areas={areas || []}
            />
          ),
        },
      },
      {
        value: 'equipment',
        name: 'Equipos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Equipos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <CustomerEquipmentTab
              equipments={equipmentsCustomers || []}
              customers={contractorCompanies || []}
              key={actualCompany}
            />
          ),
        },
      },
      {
        value: 'sector',
        name: 'Sectores',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Sectores',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <SectorTabs customers={contractorCompanies || []} sectors={sectors} contractorSectors={contractorSectors} />
          ),
        },
      },
      {
        value: 'contacts',
        name: 'Contactos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Contactos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: (
            <Link
              href={'/dashboard/company/contact/action?action=new'}
              className={buttonVariants({ variant: 'gh_orange', size: 'sm', className: 'font-semibold' })}
            >
              Registrar Contacto
            </Link>
          ),
          component: <Contacts />,
        },
      },
      {
        value: 'service',
        name: 'Contratos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Contratos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: [''],
          component: (
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
          ),
        },
      },
    ],
  };

  return (
    <div className="px-0">
      <ViewcomponentInternal viewData={viewData} />
    </div>
  );
}

export default ComercialTab;
