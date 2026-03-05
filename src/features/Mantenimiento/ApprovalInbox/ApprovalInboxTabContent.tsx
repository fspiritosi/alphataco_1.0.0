import { getActiveWorkshopSectors } from '../OrderManagement/actions/actionsServer';
import { getOrdersPendingValidation, getPendingApprovalTasks, getReturnedTasks } from './actions/actionsServer';
import { ApprovalInboxClient } from './components/ApprovalInboxClient';

/**
 * Tab de Aprobaciones - Jefe de Taller (Paso 4)
 *
 * Estructura:
 * - Indicadores: badges clickeables para Autorizaciones y Reasignaciones (abren modales)
 * - Tabla principal: ordenes pendientes de validacion (pending_workshop_validation)
 *
 * Las acciones de validacion de ordenes se importan de MaintenanceOrders/actions/actionsServer.ts
 */
export async function ApprovalInboxTabContent() {
  const [validationOrders, pendingTasks, returnedTasks, sectorsData] = await Promise.all([
    getOrdersPendingValidation(),
    getPendingApprovalTasks(),
    getReturnedTasks(),
    getActiveWorkshopSectors(),
  ]);

  const sectors = sectorsData.map((s) => ({ id: s.id, name: s.name }));

  return (
    <ApprovalInboxClient
      initialValidationOrders={validationOrders}
      initialPendingTasks={pendingTasks}
      initialReturnedTasks={returnedTasks}
      sectors={sectors}
    />
  );
}
