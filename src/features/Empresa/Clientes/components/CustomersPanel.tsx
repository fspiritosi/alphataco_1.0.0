'use client';

import type { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import type { AreaRow } from '../actions/areas.server';
import type { MeasureUnitRow } from '../actions/measure-units.server';
import type { SectorCustomerRow } from '../actions/sectors.server';
import type { CustomerServiceRow } from '../actions/services.server';
import type { CustomerRow } from '../lib/serializers';
import { CustomerDetail, type CustomerDetailPreferences } from './CustomerDetail/CustomerDetail';
import { CustomersList } from './CustomersList';

interface CustomersPanelProps {
  customers: CustomerRow[];
  services: CustomerServiceRow[];
  areas: AreaRow[];
  sectors: SectorCustomerRow[];
  measureUnits: MeasureUnitRow[];
  listVisibility: VisibilityState;
  listFilters: string[];
  preferences: CustomerDetailPreferences;
}

/**
 * Pestaña "Clientes" de Comercial: listado y, al elegir una fila, la ficha del cliente.
 * Los datos de las pestañas de la ficha (empleados/equipos) se cargan con React Query al abrirla.
 */
export function CustomersPanel({
  customers,
  services,
  areas,
  sectors,
  measureUnits,
  listVisibility,
  listFilters,
  preferences,
}: CustomersPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Siempre se toma el cliente de la lista (que el servidor refresca tras cada guardado).
  const selectedCustomer = selectedId ? (customers.find((customer) => customer.id === selectedId) ?? null) : null;

  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        services={services}
        areas={areas}
        sectors={sectors}
        measureUnits={measureUnits}
        preferences={preferences}
        onClose={() => setSelectedId(null)}
      />
    );
  }

  return (
    <CustomersList
      customers={customers}
      savedVisibility={listVisibility}
      savedFilters={listFilters}
      onSelect={(customer) => setSelectedId(customer.id)}
    />
  );
}
