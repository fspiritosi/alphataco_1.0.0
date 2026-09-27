'use client';

import { useMemo } from 'react';
import type { AreaRow } from '../../actions/areas.server';
import type { CustomerRow } from '../../lib/serializers';
import { AreaFormDialog, type ProvinceOption } from '../area_clientes/AreaFormDialog';
import AreaTable from '../area_clientes/areaTable';

interface CustomerAreasTabProps {
  customer: CustomerRow;
  areas: AreaRow[];
  provinces: ProvinceOption[];
  savedFilters: string[];
}

/**
 * Pestaña "Áreas" de la ficha del cliente.
 *
 * Un área pertenece a un cliente (`areas_cliente.customer_id`) y acá el cliente ya está fijado
 * por la ficha, así que el formulario no lo pide: lo recibe. El alta y la edición van en un
 * diálogo — el formulario al costado de la tabla le comía la mitad del ancho a la tabla y
 * obligaba a mirar dos cosas a la vez para hacer una.
 */
export function CustomerAreasTab({ customer, areas, provinces, savedFilters }: CustomerAreasTabProps) {
  const customerAreas = useMemo(() => areas.filter((area) => area.customer_id === customer.id), [areas, customer.id]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Áreas</h2>
        <AreaFormDialog customerId={customer.id} provinces={provinces} triggerLabel="Nueva área" />
      </div>

      <AreaTable
        areas={customerAreas}
        customerId={customer.id}
        provinces={provinces}
        savedFilters={savedFilters}
      />
    </div>
  );
}
