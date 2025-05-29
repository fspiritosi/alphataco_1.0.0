import { fechAllCustomers, fetchAllContractorSectorBySectorIds, fetchAreasWithProvinces } from '../../actions/create';
import { fetchServiceItems } from '../../actions/items';
import { fetchMeasureUnits } from '../../actions/meassure';
import { fetchServices } from '../../actions/service';
import ServiceTable from './ServiceTable';
interface ServiceComponentProps {
  id?: string;
  customers: Awaited<ReturnType<typeof fechAllCustomers>>;
  areas: Awaited<ReturnType<typeof fetchAreasWithProvinces>>;
  sectors: Awaited<ReturnType<typeof fetchAllContractorSectorBySectorIds>>;
  measure_units: Awaited<ReturnType<typeof fetchMeasureUnits>>;
  services: Awaited<ReturnType<typeof fetchServices>>;
  items: Awaited<ReturnType<typeof fetchServiceItems>>;
  itemsList: Awaited<ReturnType<typeof fetchServiceItems>>;
  measureUnitsList: Awaited<ReturnType<typeof fetchMeasureUnits>>;
  company_id: string;
  savedFilter: string[];
}

export default function ServiceComponent({
  id,
  customers: filterCustomers,
  areas,
  sectors,
  measure_units,
  services,
  items,
  company_id,
  savedFilter,
}: ServiceComponentProps) {
  return (
    <div>
      {services ? (
        <ServiceTable
          savedFilter={savedFilter}
          services={services}
          customers={filterCustomers}
          company_id={company_id}
          areas={areas}
          sectors={sectors}
          id={id}
          measureUnitsList={measure_units}
          itemsList={items}
          hideCreateButton={true}
        />
      ) : (
        <div>No hay servicios</div>
      )}
    </div>
  );
}
