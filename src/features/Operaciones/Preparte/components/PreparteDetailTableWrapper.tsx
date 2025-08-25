import { fetchAllContracts, fetchContractorCompanies } from '@/app/dashboard/employee/action/actions/actions';
import { fetchServiceItems } from '@/features/Operaciones/Preparte/actions/actions';
import { PreparteManager } from './PreparteManager';
interface PreparteItem {
  id: string;
  clienteId: string;
  clienteName: string;
  contratoId: string;
  requestDate: Date;
  executionDate: Date;
  tipo: string;
  jornada: string;
  solicitante: string;
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
    contratoId: 'contract_123',
    requestDate: new Date('2025-08-20T10:00:00-03:00'),
    executionDate: new Date('2025-08-20T09:00:00-03:00'),
    observaciones: 'Mantenimiento preventivo',
    tipo: 'Adicional',
    jornada: 'Jornada 8 horas',
    solicitante: 'Juan Pérez',
  },
];

export async function PreparteDetailTableWrapper() {
  const [customers, contratos, itemsList] = await Promise.all([
    fetchContractorCompanies(),
    fetchAllContracts(),
    fetchServiceItems(),
  ]);

  return (
    <div className="flex flex-col">
      <PreparteManager
        items={mockPreparteItems as any}
        Customers={customers as Cliente[]}
        contratos={contratos as Contrato[]}
        itemsList={itemsList as any}
      />
    </div>
  );
}
