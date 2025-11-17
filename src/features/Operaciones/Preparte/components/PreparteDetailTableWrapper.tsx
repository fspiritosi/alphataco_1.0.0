import { fetchAllContracts } from '@/app/dashboard/employee/action/actions/actions';
import { fetchServiceItems } from '@/features/Operaciones/Preparte/actions/actions';
import { listPrepartes } from '@/features/Operaciones/Preparte/actions/preparte';
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

export async function PreparteDetailTableWrapper() {
  const [customers, contratos, itemsList, prepartes] = await Promise.all([
    // Traer clientes con relaciones anidadas (sectores, áreas, equipos)
    (await import('@/features/Operaciones/Preparte/actions/actions')).fetchCustomersWithRelations(),
    fetchAllContracts(),
    fetchServiceItems(),
    listPrepartes(),
  ]);

  return (
    <div className="flex flex-col">
      <PreparteManager
        // items={mockPreparteItems as any}
        Customers={customers as Cliente[]}
        contratos={contratos as Contrato[]}
        itemsList={itemsList as any}
        prepartes={prepartes as any}
      />
    </div>
  );
}
