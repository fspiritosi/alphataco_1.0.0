import { fetchAllContracts } from '@/app/dashboard/employee/action/actions/actions';
import { listPrepartes } from '@/features/Operaciones/Preparte/actions/preparte';
import { PrepartePageWrapper } from './PrepartePageWrapper';

// NOTA: fetchServiceItems ahora requiere customer_service_id, por lo que no se puede
// pre-cargar todos los items aquí. Los items se cargan dinámicamente en el formulario
// usando el hook useServiceItems cuando se selecciona un contrato.
// La tabla usa los IDs de items almacenados en el preparte JSONB.

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
  const [customers, contratos, prepartes] = await Promise.all([
    // Traer clientes con relaciones anidadas (sectores, áreas, equipos)
    (await import('@/features/Operaciones/Preparte/actions/actions')).fetchCustomersWithRelations(),
    fetchAllContracts(),
    listPrepartes(),
  ]);

  return (
    <PrepartePageWrapper
      Customers={customers as Cliente[]}
      contratos={contratos as Contrato[]}
      prepartes={prepartes as any}
    />
  );
}
