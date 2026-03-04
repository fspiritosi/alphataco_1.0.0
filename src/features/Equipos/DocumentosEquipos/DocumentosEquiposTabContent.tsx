import DocumentNav from '@/components/DocumentNav';
import { MonthlyEquipmentDocumentsSkeleton } from '@/features/Documentacion/DocumentosEquipos/Mensuales/fallback/MonthlyEquipmentDocumentsSkeleton';
import { MonthlyEquipmentDocumentsList } from '@/features/Documentacion/DocumentosEquipos/Mensuales/MonthlyEquipmentDocumentsList';
import { EquipmentPermanentDocumentsSkeleton } from '@/features/Documentacion/DocumentosEquipos/Permanentes/fallback/EquipmentPermanentDocumentsSkeleton';
import { EquipmentPermanentDocumentsList } from '@/features/Documentacion/DocumentosEquipos/Permanentes/EquipmentPermanentDocumentsList';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';

export default async function DocumentosEquiposTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <div>
      <div className="flex gap-4 flex-wrap mb-4">
        <PermissionGuardServer module="equipos" tab="documentos-de-equipos" action="create">
          <DocumentNav onlyEquipment />
        </PermissionGuardServer>
      </div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="docs-equipos-permanentes"
        permissions={permissions}
        tabs={[
          {
            value: 'docs-equipos-permanentes',
            label: (
              <span className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Documentos Permanentes
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'docs-equipos-permanentes',
            content: (
              <Suspense fallback={<EquipmentPermanentDocumentsSkeleton />}>
                <EquipmentPermanentDocumentsList searchParams={searchParams} />
              </Suspense>
            ),
          },
          {
            value: 'docs-equipos-mensuales',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Documentos Mensuales
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'docs-equipos-mensuales',
            content: (
              <Suspense fallback={<MonthlyEquipmentDocumentsSkeleton />}>
                <MonthlyEquipmentDocumentsList searchParams={searchParams} />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
