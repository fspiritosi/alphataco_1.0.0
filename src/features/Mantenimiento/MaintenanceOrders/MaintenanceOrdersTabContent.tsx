import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getActiveExternalWorkshops, getActiveWorkshopSectors } from '../OrderManagement/actions/actionsServer';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '../utils/constants';
import { getMaintenanceOrders } from './actions/actionsServer';
import { MaintenanceOrdersClient } from './components/MaintenanceOrdersClient';

/**
 * Tab de Ordenes de Mantenimiento - Taller
 *
 * Muestra las ordenes de mantenimiento con su progreso por sectores.
 * Permite ver el detalle con timeline de sectores y estado de cada tarea.
 * Para ordenes en taller (in_workshop), permite gestionar asignacion de sectores.
 */
export async function MaintenanceOrdersTabContent() {
  const [initialData, sectorsData, repairTypesData, externalWorkshopsData] = await Promise.all([
    getMaintenanceOrders('in_workshop'),
    getActiveWorkshopSectors(),
    fetchAllTypesOfRepairs(),
    getActiveExternalWorkshops(),
  ]);

  const repairTypes = repairTypesData
    .filter((r) => r.id !== DIAGNOSTICO_REPAIR_TYPE_ID)
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Ordenes de Mantenimiento</CardTitle>
        <CardDescription>Seguimiento de ordenes con progreso por sectores y secuencia de ejecucion</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <MaintenanceOrdersClient
          initialData={initialData}
          sectors={sectorsData}
          repairTypes={repairTypes}
          externalWorkshops={externalWorkshopsData}
        />
      </CardContent>
    </Card>
  );
}
