import MaintenanceGroupsWrapper from '@/components/Tipos_de_reparaciones/MaintenanceGroupsWrapper';
import RepairTypeFormWrapper from '@/components/Tipos_de_reparaciones/RepairTypeFormWrapper';
import { EquiposConDesviosTabContent } from '@/features/Mantenimiento/EquiposConDesvios';
import { EquipmentsWithDeviationsSkeleton } from '@/features/Mantenimiento/EquiposConDesvios/fallback';
import { NuevoPedidoSkeleton, NuevoPedidoTabContent } from '@/features/Mantenimiento/NuevoPedido';
import { OrdenesTrabajoSkeleton, OrdenesTrabajoTabContent } from '@/features/Mantenimiento/OrdenesTrabajo';
import { PedidosMantenimientoTabContent } from '@/features/Mantenimiento/PedidosMantenimiento';
import { PedidosTableSkeleton } from '@/features/Mantenimiento/PedidosMantenimiento/fallback';
import { SolicitudesMantenimientoTabContent } from '@/features/Mantenimiento/SolicitudesMantenimiento';
import { SolicitudesTableSkeleton } from '@/features/Mantenimiento/SolicitudesMantenimiento/fallback';
import { TabsManagerServer } from '@/features/TabsManager';
import {
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Plus,
  Settings,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { Suspense } from 'react';
import { PendientesEjecutarTabContent } from './PendientesEjecutar';
import { PendientesEjecutarSkeleton } from './PendientesEjecutar/fallback';
import { PlanificacionTabContent } from './Planificacion';
import { PlanificacionTableSkeleton } from './Planificacion/fallback';

interface MantenimientoComponentProps {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}

/**
 * Componente principal del módulo Mantenimiento con la nueva estructura de tabs:
 *
 * - Operaciones (maint_operaciones)
 *   - Equipos con Desvíos
 *   - Solicitudes de Mantenimiento
 *   - Pendientes de Ejecutar
 *   - Nuevo Pedido
 *
 * - Taller (maint_taller)
 *   - Pedidos de Mantenimiento
 *   - Planificación
 *   - Órdenes de Trabajo
 *
 * - Configuración (maint_configuracion)
 *   - Tipos de Reparación
 *   - Grupos
 */
export default async function MantenimientoComponent({ searchParams, permissions }: MantenimientoComponentProps) {
  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="maint_operaciones"
      permissions={permissions}
      tabs={[
        // ============================================
        // TAB 1: OPERACIONES
        // ============================================
        {
          value: 'maint_operaciones',
          label: (
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Operaciones
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'maint_operaciones',
          content: (
            <TabsManagerServer
              paramName="subtab"
              searchParams={searchParams}
              defaultTab="equipments_with_deviations"
              permissions={permissions}
              dependentParams={['operations_subtab']}
              tabs={[
                {
                  value: 'equipments_with_deviations',
                  label: (
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Equipos con Desvíos
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'equipments_with_deviations',
                  content: (
                    <Suspense fallback={<EquipmentsWithDeviationsSkeleton />}>
                      <EquiposConDesviosTabContent />
                    </Suspense>
                  ),
                },
                {
                  value: 'maintenance_requests',
                  label: (
                    <span className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Pendientes de Validar
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'maintenance_requests',
                  content: (
                    <Suspense fallback={<SolicitudesTableSkeleton />}>
                      <SolicitudesMantenimientoTabContent />
                    </Suspense>
                  ),
                },
                {
                  value: 'pendientes_ejecutar',
                  label: (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Aprobación de Fecha
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'pendientes_ejecutar',
                  content: (
                    <Suspense fallback={<PendientesEjecutarSkeleton />}>
                      <PendientesEjecutarTabContent />
                    </Suspense>
                  ),
                },
                {
                  value: 'nuevo_pedido',
                  label: (
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Nuevo Pedido
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'nuevo_pedido',
                  content: (
                    <Suspense fallback={<NuevoPedidoSkeleton />}>
                      <NuevoPedidoTabContent />
                    </Suspense>
                  ),
                },
              ]}
            />
          ),
        },
        // ============================================
        // TAB 2: TALLER
        // ============================================
        {
          value: 'maint_taller',
          label: (
            <span className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Taller
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'maint_taller',
          content: (
            <TabsManagerServer
              paramName="subtab"
              searchParams={searchParams}
              defaultTab="maintenance_orders"
              permissions={permissions}
              dependentParams={['taller_subtab']}
              tabs={[
                {
                  value: 'maintenance_orders',
                  label: (
                    <span className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Pedidos de Mantenimiento
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'maintenance_orders',
                  content: (
                    <Suspense fallback={<PedidosTableSkeleton />}>
                      <PedidosMantenimientoTabContent searchParams={searchParams} permissions={permissions} />
                    </Suspense>
                  ),
                },
                {
                  value: 'planificacion',
                  label: (
                    <span className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Planificación
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'planificacion',
                  content: (
                    <Suspense fallback={<PlanificacionTableSkeleton />}>
                      <PlanificacionTabContent />
                    </Suspense>
                  ),
                },
                {
                  value: 'ordenes_trabajo',
                  label: (
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Órdenes de Trabajo
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'ordenes_trabajo',
                  content: (
                    <Suspense fallback={<OrdenesTrabajoSkeleton />}>
                      <OrdenesTrabajoTabContent />
                    </Suspense>
                  ),
                },
              ]}
            />
          ),
        },
        // ============================================
        // TAB 3: CONFIGURACIÓN
        // ============================================
        {
          value: 'maint_configuracion',
          label: (
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'maint_configuracion',
          content: (
            <TabsManagerServer
              paramName="subtab"
              searchParams={searchParams}
              defaultTab="type_of_repair"
              permissions={permissions}
              dependentParams={['config_subtab']}
              tabs={[
                {
                  value: 'type_of_repair',
                  label: (
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Tipos de Reparación
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'type_of_repair',
                  content: (
                    <Suspense fallback={<div>Cargando tipos de reparación...</div>}>
                      <RepairTypeFormWrapper />
                    </Suspense>
                  ),
                },
                {
                  value: 'maintenance_groups',
                  label: (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Grupos
                    </span>
                  ),
                  moduleSlug: 'mantenimiento',
                  tabSlug: 'maintenance_groups',
                  content: (
                    <Suspense fallback={<div>Cargando grupos...</div>}>
                      <MaintenanceGroupsWrapper />
                    </Suspense>
                  ),
                },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
