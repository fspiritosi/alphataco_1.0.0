'use client';

import Cookies from 'js-cookie';
import type { VisibilityState } from '@tanstack/react-table';
import type { AreaRow } from '../../actions/areas.server';
import type { MeasureUnitRow } from '../../actions/measure-units.server';
import type { SectorCustomerRow } from '../../actions/sectors.server';
import type { CustomerServiceRow } from '../../actions/services.server';
import type { CustomerRef } from '../../lib/serializers';
import ServiceTable from './ServiceTable';

interface ServiceComponentProps {
  customers: CustomerRef[];
  areas: AreaRow[];
  sectors: SectorCustomerRow[];
  measureUnits: MeasureUnitRow[];
  services: CustomerServiceRow[];
  savedFilter: string[];
}

function readCookieJson<T>(name: string, fallback: T): T {
  const raw = Cookies.get(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Pestaña "Contratos" de Comercial: todos los contratos de la empresa con alta. */
export default function ServiceComponent({
  customers,
  areas,
  sectors,
  measureUnits,
  services,
  savedFilter,
}: ServiceComponentProps) {
  const savedVisibility = readCookieJson<VisibilityState>('services-table', {});
  const savedItemsVisibility = readCookieJson<VisibilityState>('service-items-table', {});
  const savedItemsFilters = readCookieJson<string[]>('service-items-table-filters', []);

  return (
    <ServiceTable
      services={services}
      customers={customers}
      areas={areas}
      sectors={sectors}
      measureUnits={measureUnits}
      showCreateButton
      savedFilters={savedFilter}
      savedVisibility={savedVisibility}
      savedItemsFilters={savedItemsFilters}
      savedItemsVisibility={savedItemsVisibility}
    />
  );
}
