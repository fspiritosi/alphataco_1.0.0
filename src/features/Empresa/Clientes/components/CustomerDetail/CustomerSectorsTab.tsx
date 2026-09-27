'use client';

import { useMemo } from 'react';
import type { SectorRow } from '../../actions/sectors.server';
import type { CustomerRow } from '../../lib/serializers';
import { SectorFormDialog } from '../sector_clientes/SectorFormDialog';
import SectorTable from '../sector_clientes/sectorTable';

interface CustomerSectorsTabProps {
  customer: CustomerRow;
  sectors: SectorRow[];
}

/**
 * Pestaña "Sectores" de la ficha del cliente.
 *
 * Desde tsk-745 un sector pertenece a UN cliente (`sectors.customer_id`); antes era una tabla
 * global compartida por pivote. El cliente lo fija la ficha, igual que en Áreas.
 */
export function CustomerSectorsTab({ customer, sectors }: CustomerSectorsTabProps) {
  const customerSectors = useMemo(
    () => sectors.filter((sector) => sector.customer_id === customer.id),
    [sectors, customer.id]
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Sectores</h2>
        <SectorFormDialog customerId={customer.id} triggerLabel="Nuevo sector" />
      </div>

      <SectorTable contractorSectors={customerSectors} customerId={customer.id} />
    </div>
  );
}
