'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/features/Permissions';
import type { VisibilityState } from '@tanstack/react-table';
import type { AreaRow } from '../../actions/areas.server';
import type { MeasureUnitRow } from '../../actions/measure-units.server';
import type { SectorCustomerRow } from '../../actions/sectors.server';
import type { CustomerServiceRow } from '../../actions/services.server';
import type { CustomerRow } from '../../lib/serializers';
import { CustomerContractsTab } from './CustomerContractsTab';
import { CustomerDetailTab } from './CustomerDetailTab';
import { CustomerEmployeesTab } from './CustomerEmployeesTab';
import { CustomerEquipmentTab } from './CustomerEquipmentTab';

export interface CustomerDetailPreferences {
  employeesVisibility: VisibilityState;
  equipmentVisibility: VisibilityState;
  equipmentFilters: string[];
  servicesFilters: string[];
  servicesVisibility: VisibilityState;
  serviceItemsFilters: string[];
  serviceItemsVisibility: VisibilityState;
}

interface CustomerDetailProps {
  customer: CustomerRow;
  services: CustomerServiceRow[];
  areas: AreaRow[];
  sectors: SectorCustomerRow[];
  measureUnits: MeasureUnitRow[];
  preferences: CustomerDetailPreferences;
  onClose: () => void;
}

/** Ficha del cliente: Detalle / Empleados / Equipos / Contratos. */
export function CustomerDetail({
  customer,
  services,
  areas,
  sectors,
  measureUnits,
  preferences,
  onClose,
}: CustomerDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Detalles del Cliente {customer.name}</h2>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <Tabs defaultValue="detalle">
        <TabsList>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
          <TabsTrigger value="equipos">Equipos</TabsTrigger>
          {/* Hereda permisos de comercial/service */}
          <PermissionGuard module="comercial" tab="service" action="view">
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="detalle">
          <CustomerDetailTab customer={customer} />
        </TabsContent>

        <TabsContent value="empleados">
          <CustomerEmployeesTab customer={customer} savedVisibility={preferences.employeesVisibility} />
        </TabsContent>

        <TabsContent value="equipos">
          <CustomerEquipmentTab
            customer={customer}
            savedVisibility={preferences.equipmentVisibility}
            savedFilters={preferences.equipmentFilters}
          />
        </TabsContent>

        {/* Hereda permisos de comercial/service */}
        <PermissionGuard module="comercial" tab="service" action="view">
          <TabsContent value="contratos">
            <CustomerContractsTab
              customer={customer}
              services={services}
              areas={areas}
              sectors={sectors}
              measureUnits={measureUnits}
              savedFilters={preferences.servicesFilters}
              savedVisibility={preferences.servicesVisibility}
              savedItemsFilters={preferences.serviceItemsFilters}
              savedItemsVisibility={preferences.serviceItemsVisibility}
            />
          </TabsContent>
        </PermissionGuard>
      </Tabs>
    </div>
  );
}
