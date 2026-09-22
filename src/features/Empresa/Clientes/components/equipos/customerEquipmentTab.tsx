'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { useState } from 'react';
import type { CustomerEquipmentRow } from '../../actions/customer-equipment.server';
import type { CustomerRef } from '../../lib/serializers';
import CustomerEquipmentForm from './customerEquipmentForm';
import CustomerEquipmentTable from './customerEquipmentTable';

interface CustomerEquipmentTabProps {
  customers: CustomerRef[];
  equipments: CustomerEquipmentRow[];
}

/** Pestaña "Equipos" (de clientes) de Comercial: formulario lateral + tabla. */
function CustomerEquipmentTab({ customers, equipments }: CustomerEquipmentTabProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<CustomerEquipmentRow | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  const canCreateOrUpdate =
    hasPermission('comercial', 'equipment', 'create') || hasPermission('comercial', 'equipment', 'update');

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={30}>
              <CustomerEquipmentForm
                customers={customers}
                mode={mode}
                setMode={setMode}
                selectedEquipment={selectedEquipment}
                setSelectedEquipment={setSelectedEquipment}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={canCreateOrUpdate ? 70 : 100}>
          <CustomerEquipmentTable
            customerEquipments={equipments}
            setSelectedCustomerEquipment={setSelectedEquipment}
            setMode={setMode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default CustomerEquipmentTab;
