'use client';

import type { VisibilityState } from '@tanstack/react-table';
import { useMemo } from 'react';
import type { AreaRow } from '../../actions/areas.server';
import type { MeasureUnitRow } from '../../actions/measure-units.server';
import type { SectorRow } from '../../actions/sectors.server';
import type { CustomerServiceRow } from '../../actions/services.server';
import type { CustomerRow } from '../../lib/serializers';
import ServiceTable from '../Services/ServiceTable';

interface CustomerContractsTabProps {
  customer: CustomerRow;
  services: CustomerServiceRow[];
  areas: AreaRow[];
  sectors: SectorRow[];
  measureUnits: MeasureUnitRow[];
  savedFilters: string[];
  savedVisibility: VisibilityState;
  savedItemsFilters: string[];
  savedItemsVisibility: VisibilityState;
}

/** Pestaña "Contratos": los contratos del cliente seleccionado (hereda permisos de comercial/service). */
export function CustomerContractsTab({
  customer,
  services,
  areas,
  sectors,
  measureUnits,
  savedFilters,
  savedVisibility,
  savedItemsFilters,
  savedItemsVisibility,
}: CustomerContractsTabProps) {
  const customerServices = useMemo(
    () => services.filter((service) => service.customer_id === customer.id),
    [services, customer.id]
  );

  return (
    <div className="p-6 rounded-lg border">
      <h3 className="text-xl font-semibold mb-6">Contratos del Cliente</h3>
      <ServiceTable
        services={customerServices}
        customers={[{ id: customer.id, name: customer.name }]}
        areas={areas}
        sectors={sectors}
        measureUnits={measureUnits}
        savedFilters={savedFilters}
        savedVisibility={savedVisibility}
        savedItemsFilters={savedItemsFilters}
        savedItemsVisibility={savedItemsVisibility}
      />
    </div>
  );
}
