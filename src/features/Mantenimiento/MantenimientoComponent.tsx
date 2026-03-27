import { Skeleton } from '@/components/ui/skeleton';
import { EquiposConDesviosTabContent } from '@/features/Mantenimiento/EquiposConDesvios';
import { EquipmentsWithDeviationsSkeleton } from '@/features/Mantenimiento/EquiposConDesvios/fallback';
import GomeriaTabContent from '@/features/Mantenimiento/Gomeria/GomeriaTabContent';
import { NuevoPedidoSkeleton, NuevoPedidoTabContent } from '@/features/Mantenimiento/NuevoPedido';
import { RepairSolicitudesTabContent } from '@/features/Mantenimiento/RepairSolicitudes/RepairSolicitudesTabContent';
import { RepairSolicitudesSkeleton } from '@/features/Mantenimiento/RepairSolicitudes/fallback/RepairSolicitudesSkeleton';
import MaintenanceGroupsWrapper from '@/features/Mantenimiento/TiposReparaciones/MaintenanceGroupsWrapper';
import RepairEntryWrapper from '@/features/Mantenimiento/TiposReparaciones/RepairEntryWrapper';
import RepairTypeFormWrapper from '@/features/Mantenimiento/TiposReparaciones/RepairTypeFormWrapper';
import { TabsManagerServer } from '@/features/TabsManager';
import { AlertTriangle, CircleDot, ClipboardList, Plus, Settings, Users, Warehouse } from 'lucide-react';
import { Suspense } from 'react';
import { OperacionesPipelineContent } from './Pipeline/OperacionesPipeline/OperacionesPipelineContent';
import { OperacionesPipelineSkeleton } from './Pipeline/OperacionesPipeline/fallback/OperacionesPipelineSkeleton';
import { TallerPipelineContent } from './Pipeline/TallerPipeline/TallerPipelineContent';
import { TallerPipelineSkeleton } from './Pipeline/TallerPipeline/fallback/TallerPipelineSkeleton';

interface MantenimientoComponentProps {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}

/**
 * Componente principal del módulo Mantenimiento.
 *
 * Estructura de tabs raíz:
 * - Solicitudes Activas: tabla general de solicitudes creadas
 * - Nueva Solicitud: formulario para crear solicitud
 * - Operaciones: pipeline visual con 4 pasos (Validar → Aprobar Fecha → Para Taller → Seguimiento)
 * - Taller: pipeline visual con 4 pasos (Por Programar → Confirmados → En Taller → Aprobaciones)
 * - Nuevo Pedido: formulario de nuevo pedido de mantenimiento
 * - Equipos con Desvíos: tabla de equipos con desvíos pendientes
 * - Configuración: tipos de reparación y grupos
 */
export default async function MantenimientoComponent({ searchParams, permissions }: MantenimientoComponentProps) {
  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="maint_operaciones"
      permissions={permissions}
      dependentParams={['gomeria_tab', 'config_subtab']}
      tabs={[
        {
          value: 'created_solicitudes',
          label: (
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Solicitudes Activas
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'created_solicitudes' as const,
          content: (
            <Suspense fallback={<RepairSolicitudesSkeleton />}>
              <RepairSolicitudesTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'type_of_repair_new_entry',
          label: (
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Solicitud
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'type_of_repair_new_entry' as const,
          content: (
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
              <RepairEntryWrapper searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        // ============================================
        // TAB: OPERACIONES (Pipeline visual)
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
            <Suspense fallback={<OperacionesPipelineSkeleton />}>
              <OperacionesPipelineContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        // ============================================
        // TAB: TALLER (Pipeline visual)
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
            <Suspense fallback={<TallerPipelineSkeleton />}>
              <TallerPipelineContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        // ============================================
        // TAB: NUEVO PEDIDO (movido desde subtab de Operaciones)
        // ============================================
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
        // ============================================
        // TAB: EQUIPOS CON DESVÍOS (movido desde subtab de Operaciones)
        // ============================================
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
        // ============================================
        // TAB: GOMERÍA
        // ============================================
        {
          value: 'gomeria',
          label: (
            <span className="flex items-center gap-2">
              <CircleDot className="h-4 w-4" /> Gomería
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'gomeria',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <GomeriaTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        // ============================================
        // TAB: CONFIGURACIÓN
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
                    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
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
                    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
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
