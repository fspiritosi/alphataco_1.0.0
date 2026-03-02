import DocumentNav from '@/components/DocumentNav';
import { PermissionGuardServer, getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { EquipmentPermanentDocumentsList } from '@/features/Documentacion/DocumentosEquipos/Permanentes/EquipmentPermanentDocumentsList';
import { MonthlyEquipmentDocumentsList } from '@/features/Documentacion/DocumentosEquipos/Mensuales/MonthlyEquipmentDocumentsList';
import { EquipmentPermanentDocumentsSkeleton } from '@/features/Documentacion/DocumentosEquipos/Permanentes/fallback/EquipmentPermanentDocumentsSkeleton';
import { MonthlyEquipmentDocumentsSkeleton } from '@/features/Documentacion/DocumentosEquipos/Mensuales/fallback/MonthlyEquipmentDocumentsSkeleton';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentDocumentDetailProps {
  equipmentId: string;
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function EquipmentDocumentDetail({ equipmentId, searchParams }: EquipmentDocumentDetailProps) {
  // Obtener permisos (usa cache del layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="permanentes"
      permissions={permissions}
      tabs={[
        {
          value: 'permanentes',
          label: (
            <span className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Documentos Permanentes
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'docs-equipos-permanentes',
          content: (
            <div>
              <PermissionGuardServer module="documentacion" tab="documentos-de-equipos" action="create">
                <div className="flex gap-4 flex-wrap mb-4">
                  <DocumentNav id_user={equipmentId} onlyEquipment onlyNoMultiresource />
                </div>
              </PermissionGuardServer>
              <Suspense fallback={<EquipmentPermanentDocumentsSkeleton />}>
                <EquipmentPermanentDocumentsList
                  searchParams={searchParams}
                  equipmentId={equipmentId}
                />
              </Suspense>
            </div>
          ),
        },
        {
          value: 'mensuales',
          label: (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Documentos Mensuales
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'docs-equipos-mensuales',
          content: (
            <div>
              <PermissionGuardServer module="documentacion" tab="documentos-de-equipos" action="create">
                <div className="flex gap-4 flex-wrap mb-4">
                  <DocumentNav id_user={equipmentId} onlyEquipment onlyNoMultiresource />
                </div>
              </PermissionGuardServer>
              <Suspense fallback={<MonthlyEquipmentDocumentsSkeleton />}>
                <MonthlyEquipmentDocumentsList
                  searchParams={searchParams}
                  equipmentId={equipmentId}
                />
              </Suspense>
            </div>
          ),
        },
      ]}
    />
  );
}
