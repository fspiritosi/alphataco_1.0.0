'use client';

import { PreparteManager, type Cliente, type Contrato, type PreparteItem } from './PreparteManager';
import { StatusFilterProvider, useStatusFilter } from './StatusCardsClientWrapper';

interface PrepartePageWrapperProps {
  Customers: Cliente[];
  contratos: Contrato[];
  prepartes: PreparteItem[];
  statusCardsSlot: React.ReactNode; // Server component pasado como slot
}

/**
 * Client wrapper interno que consume el contexto del filtro
 */
function PreparteContent({ Customers, contratos, prepartes, statusCardsSlot }: PrepartePageWrapperProps) {
  const { statusFilter, setStatusFilter } = useStatusFilter();

  return (
    <div className="flex flex-col">
      <PreparteManager
        Customers={Customers}
        contratos={contratos}
        prepartes={prepartes}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCards={statusCardsSlot}
      />
    </div>
  );
}

/**
 * Client wrapper que provee el contexto del filtro de status
 * Recibe las StatusCards pre-renderizadas desde el servidor como slot
 */
export function PrepartePageWrapper(props: PrepartePageWrapperProps) {
  return (
    <StatusFilterProvider>
      <PreparteContent {...props} />
    </StatusFilterProvider>
  );
}
