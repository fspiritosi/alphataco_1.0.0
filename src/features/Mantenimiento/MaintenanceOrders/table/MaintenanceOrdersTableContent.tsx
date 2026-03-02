'use client';

/**
 * Client wrapper para MaintenanceOrderList que maneja el wizard de gestión.
 *
 * El wizard de gestión requiere datos adicionales (getOrderForManagement)
 * que no se cargan en la tabla principal, por lo que este componente actúa
 * como intermediario entre el DataTable y el ManageOrderWizard.
 */

import {
  getOrderForManagement,
  type ExternalWorkshop,
  type OrderManagementItem,
  type WorkshopSector,
} from '@/features/Mantenimiento/OrderManagement/actions/actionsServer';
import { ManageOrderWizard } from '@/features/Mantenimiento/OrderManagement/components/ManageOrderWizard';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOrderListItem } from './actions.server';

// ============================================================================
// TYPES
// ============================================================================

interface MaintenanceOrdersTableContentProps {
  children: (props: { onManageOrder: (order: MaintenanceOrderListItem) => void }) => React.ReactNode;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaintenanceOrdersTableContent({
  children,
  sectors,
  repairTypes,
  externalWorkshops,
}: MaintenanceOrdersTableContentProps) {
  const [manageOrder, setManageOrder] = useState<OrderManagementItem | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [loadingManageOrder, setLoadingManageOrder] = useState(false);

  const handleManageOrder = async (order: MaintenanceOrderListItem) => {
    setLoadingManageOrder(true);
    try {
      const detailedOrder = await getOrderForManagement(order.id);
      setManageOrder(detailedOrder);
      setManageDialogOpen(true);
    } catch {
      toast.error('Error al cargar los datos de gestión');
    } finally {
      setLoadingManageOrder(false);
    }
  };

  const handleCloseManage = () => {
    setManageDialogOpen(false);
    setManageOrder(null);
  };

  return (
    <>
      {children({ onManageOrder: handleManageOrder })}

      {/* Loading overlay para carga de datos de gestión */}
      {loadingManageOrder && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Cargando datos de gestión...</span>
          </div>
        </div>
      )}

      {/* Wizard de gestión */}
      <ManageOrderWizard
        order={manageOrder}
        open={manageDialogOpen}
        onClose={handleCloseManage}
        sectors={sectors}
        repairTypes={repairTypes}
        externalWorkshops={externalWorkshops}
      />
    </>
  );
}
