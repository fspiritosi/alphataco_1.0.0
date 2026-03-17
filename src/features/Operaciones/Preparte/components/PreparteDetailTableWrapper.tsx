import { fetchAllContracts } from '@/features/Equipos/EquipoID/actions/vehicle-actions';
import { fetchCustomersWithRelations } from '@/features/Operaciones/Preparte/actions/actions';
import { PrepartePageWrapper } from './PrepartePageWrapper';
import { StatusCardsServerContainer } from './StatusCardsServerContainer';

// NOTA: No se pre-cargan prepartes aquí porque la tabla tiene serverSide={true}
// y hace su propio fetch paginado al montar (fetchPrepartes). Traer 100 registros
// iniciales sería al pedo ya que se reemplazan inmediatamente.

export async function PreparteDetailTableWrapper() {
  const [customers, contratos] = await Promise.all([fetchCustomersWithRelations(), fetchAllContracts()]);

  return (
    <PrepartePageWrapper
      Customers={customers}
      contratos={contratos}
      prepartes={[]}
      statusCardsSlot={<StatusCardsServerContainer />}
    />
  );
}
