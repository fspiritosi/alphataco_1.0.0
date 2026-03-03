import { getActiveWorkshopSectors } from '../OrderManagement/actions/actionsServer';
import { getPendingApprovalTasks, getReturnedTasks } from './actions/actionsServer';
import { ApprovalInboxClient } from './components/ApprovalInboxClient';

/**
 * Tab de Bandeja de Aprobaciones - Jefe de Taller
 *
 * Dos sub-secciones:
 * 1. Pendientes de Autorizacion: tareas con tipos de reparacion autorizables agregadas por operarios
 * 2. Reasignacion: tareas devueltas por operarios para reasignacion a otro sector
 */
export async function ApprovalInboxTabContent() {
  const [pendingTasks, returnedTasks, sectorsData] = await Promise.all([
    getPendingApprovalTasks(),
    getReturnedTasks(),
    getActiveWorkshopSectors(),
  ]);

  const sectors = sectorsData.map((s) => ({ id: s.id, name: s.name }));

  return (
    <ApprovalInboxClient initialPendingTasks={pendingTasks} initialReturnedTasks={returnedTasks} sectors={sectors} />
  );
}
