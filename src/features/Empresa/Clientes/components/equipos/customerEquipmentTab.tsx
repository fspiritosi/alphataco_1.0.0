'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import CustomerEquipmentForm from './customerEquipmentForm';
import CustomerEquipmentTable from './customerEquipmentTable';

// Definir interfaces para los tipos
interface Customer {
  id: string;
  name: string;
  company_id: string;
  address: string | null;
  client_email: string | null;
  client_phone: number | null;
  created_at: string;
  cuit: number;
  is_active: boolean | null;
  reason_for_termination: string | null;
  termination_date: string | null;
}

interface Equipment {
  id: string;
  name: string;
  customer_id: string;
  customers: Customer | null;
  created_at: string;
  type: 'Perforador' | 'Perforador Spudder' | 'Work over' | 'Fractura' | 'Coiled Tubing';
}

interface CustomerEquipmentTabProps {
  customers: Customer[];
  equipments: Equipment[];
}

function customerEquipmentTab({ customers, equipments, key }: CustomerEquipmentTabProps & { key?: string }) {
  const [SelectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [initialized, setInitialized] = useState(false);
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('comercial', 'equipment', 'create') || hasPermission('comercial', 'equipment', 'update');

  useEffect(() => {
    if (customers.length > 0 || equipments.length > 0) {
      setInitialized(true);
    }
  }, [customers, equipments]);

  // Obtener el ID de la compañía actual de la cookie
  const actualCompanyId = Cookies.get('actualComp');

  // Filtrar los clientes que pertenecen a la compañía actual
  const companyCustomers = customers.filter((customer) => customer.company_id === actualCompanyId);

  // Filtrar los equipos que pertenecen a los clientes de la compañía actual
  const companyEquipments = equipments.filter((equipment) => {
    const customer = companyCustomers.find((c) => c.id === equipment.customer_id);
    return customer !== undefined;
  });

  if (!initialized) {
    return null;
  }

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={30}>
              <CustomerEquipmentForm
                customers={companyCustomers}
                equipments={companyEquipments}
                mode={mode}
                setMode={setMode}
                selectedEquipment={SelectedEquipment}
                setSelectedEquipment={setSelectedEquipment}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={canCreateOrUpdate ? 70 : 100}>
          <CustomerEquipmentTable
            customers={companyCustomers as any}
            customerEquipments={companyEquipments}
            selectedCustomerEquipment={SelectedEquipment}
            setSelectedCustomerEquipment={setSelectedEquipment}
            setMode={setMode}
            mode={mode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default customerEquipmentTab;
