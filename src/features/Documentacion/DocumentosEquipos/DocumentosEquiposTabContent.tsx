import DocumentNav from '@/components/DocumentNav';
import { MonthlyEquipmentDocumentsWrapper } from '@/features/Equipos/DocumentosEquipos';
import { PermanentEquipmentDocumentsWrapper } from '@/features/Equipos/DocumentosEquipos/Permanents';
import { getUserPermissionsMapServer, PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';

export default async function DocumentosEquiposTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div>
      {/* Botón crear está en la tab principal, no en subtabs */}
      <PermissionGuardServer module="documentacion" tab="documentos-de-equipos" action="create">
        <div className="flex gap-4 flex-wrap mb-4">
          <DocumentNav onlyEquipment />
        </div>
      </PermissionGuardServer>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="equipos-permanentes"
        permissions={permissions}
        tabs={[
          {
            value: 'equipos-permanentes',
            label: (
              <span className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Documentos Permanentes
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-equipos-permanentes',
            content: (
              <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
                <PermanentEquipmentDocumentsWrapper />
              </Suspense>
            ),
          },
          {
            value: 'equipos-mensuales',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Documentos Mensuales
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-equipos-mensuales',
            content: (
              <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
                <MonthlyEquipmentDocumentsWrapper />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
