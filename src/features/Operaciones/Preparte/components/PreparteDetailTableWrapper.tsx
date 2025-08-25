import { fetchContractorCompanies, fetchContractsByClientId } from '@/app/dashboard/employee/action/actions/actions';
import { PreparteManager } from './PreparteManager';
interface PreparteItem {
  id: string;
  clienteId: string;
  clienteName: string;
  requestDate: Date;
  executionDate: Date;
  observaciones: string;
}

// Tipo de datos para los clientes
type Cliente = {
  id: string;
  name: string;
};
type Contrato = {
  id: string;
  service_name: string;
};

const mockPreparteItems: PreparteItem[] = [
  {
    id: 'drr_123',
    clienteId: 'customer_123',
    clienteName: 'Empresa Ejemplo S.A.',
    requestDate: new Date('2025-08-20T10:00:00-03:00'),
    executionDate: new Date('2025-08-20T09:00:00-03:00'),
    observaciones: 'Mantenimiento preventivo',
  },
];

export async function PreparteDetailTableWrapper() {
  const customers = await fetchContractorCompanies();
  const contratos = await fetchContractsByClientId('');
  console.log(contratos);

  return (
    <div className="flex flex-col">
      <PreparteManager
        items={mockPreparteItems as any}
        Customers={customers as Cliente[]}
        contratos={contratos as Contrato[]}
      />
    </div>
  );
}
