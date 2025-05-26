import ServiceTable from './ServiceTable';

interface measure_unit {
  id: number;
  unit: string;
  simbol: string;
  tipo: string;
}
interface customer {
  id: string;
  name: string;
  is_active: boolean | null;
  address: string | null;
  client_email: string | null;
  client_phone: number | null;
  company_id: string;
  created_at: string;
  cuit: number;
  reason_for_termination: string | null;
  termination_date: string | null;
}
interface ServiceComponentProps {
  id?: string;
  customers: Customer[];
  areas: any[];
  sectors: any[];
  measure_units: any[];
  services: any[];
  items: any[];
  itemsList: any[];
  measureUnitsList: any[];
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
