'use client';

import { useState } from 'react';
import type { PreparteItem } from './PreparteManager';
import { PreparteManager, type Cliente } from './PreparteManager';
import type { Status } from './StatusCardServer';
import { StatusCardsServerContainer } from './StatusCardsServerContainer';

interface PrepartePageWrapperProps {
  Customers: Cliente[];
  contratos: Array<{ id: string; service_name: string }>;
  prepartes: PreparteItem[];
}

/**
 * Client wrapper que maneja el estado del filtro de status y coordina
 * StatusCardsServerContainer (server) con PreparteManager/Table (client)
 */
export function PrepartePageWrapper({ Customers, contratos, prepartes }: PrepartePageWrapperProps) {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

  return (
    <div className="flex flex-col">
      <PreparteManager
        Customers={Customers}
        contratos={contratos}
        prepartes={prepartes}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCards={
          <StatusCardsServerContainer
            onStatusClick={(status) => setStatusFilter(status)}
            selectedStatus={statusFilter}
          />
        }
      />
    </div>
  );
}
