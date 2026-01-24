import { TabsManagerServer } from '@/features/TabsManager';
import { CheckCircle, Clock } from 'lucide-react';
import { Suspense } from 'react';
import { ConfirmadosTabContent } from './Confirmados/ConfirmadosTabContent';
import { PendientesTabContent } from './Pendientes/PendientesTabContent';
import { PendientesTableSkeleton } from './fallback';

interface PedidosMantenimientoTabContentProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  permissions?: Record<string, boolean>;
}

/**
 * Tab de Pedidos de Mantenimiento
 *
 * Contiene 2 subtabs:
 * - Pendientes: Pedidos pendientes de planificar (pending_scheduling) y pendientes de aprobación (scheduled)
 * - Confirmados: Pedidos con fecha confirmada (date_confirmed), listos para entrada a taller
 */
export async function PedidosMantenimientoTabContent({
  searchParams,
  permissions,
}: PedidosMantenimientoTabContentProps) {
  const tabs = [
    {
      value: 'pendientes',
      label: (
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pendientes
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'pedidos_pendientes' as const,
      content: (
        <Suspense fallback={<PendientesTableSkeleton />}>
          <PendientesTabContent />
        </Suspense>
      ),
    },
    {
      value: 'confirmados',
      label: (
        <span className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Confirmados
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'pedidos_confirmados' as const,
      content: (
        <Suspense fallback={<PendientesTableSkeleton />}>
          <ConfirmadosTabContent />
        </Suspense>
      ),
    },
  ];

  return (
    <TabsManagerServer
      paramName="pedidos_tab"
      searchParams={searchParams || {}}
      defaultTab="pendientes"
      permissions={permissions || {}}
      tabs={tabs}
    />
  );
}
