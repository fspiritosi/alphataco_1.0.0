import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '../utils/constants';
import {
  getActiveExternalWorkshops,
  getActiveWorkshopSectors,
  getMaintenanceOrdersForManagement,
} from './actions/actionsServer';
import { OrderManagementClient } from './components/OrderManagementClient';

/**
 * Tab de Gestion de Ordenes - Jefe de Taller
 *
 * Permite al Jefe de Taller gestionar los pedidos que ya ingresaron al taller:
 * - Ver items del pedido
 * - Agregar items manualmente
 * - Asignar items a sectores con orden de secuencia
 * - Se crea automaticamente un DIAGNOSTICO por sector
 */
export async function OrderManagementTabContent() {
  const [initialData, sectorsData, repairTypesData, externalWorkshopsData] = await Promise.all([
    getMaintenanceOrdersForManagement(),
    getActiveWorkshopSectors(),
    fetchAllTypesOfRepairs(),
    getActiveExternalWorkshops(),
  ]);

  const repairTypes = repairTypesData
    .filter((r) => r.id !== DIAGNOSTICO_REPAIR_TYPE_ID)
    .map((r) => ({
      id: r.id,
      name: r.name,
    }));

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Gestion de Ordenes</CardTitle>
        <CardDescription>Asignar items de reparacion a sectores del taller con orden de secuencia</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <OrderManagementClient
          initialData={initialData}
          sectors={sectorsData}
          repairTypes={repairTypes}
          externalWorkshops={externalWorkshopsData}
        />
      </CardContent>
    </Card>
  );
}
