import TypesDocumentAction from '@/app/dashboard/document/documentComponents/TypesDocumentAction';
import TypesDocumentsViewWrapper from '@/app/dashboard/document/documentComponents/TypesDocumentsViewWrapper';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Truck, User } from 'lucide-react';
import { Suspense } from 'react';

export default async function TiposDocumentosTabContent({
  searchParams,
  showOnlyPersonas = false,
  showOnlyEquipos = false,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  showOnlyPersonas?: boolean;
  showOnlyEquipos?: boolean;
  permissions: Record<string, boolean>;
}) {
  console.log('[TiposDocumentosTabContent] Recibió permisos, count:', Object.keys(permissions).length);

  const allTabs = [];

  // Solo agregar tab de Personas si corresponde
  if (!showOnlyEquipos) {
    allTabs.push({
      value: 'Personas',
      label: (
        <span className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Personas
        </span>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'tipos-docs-personas' as const,
      content: (
        <Suspense fallback={<div>Cargando tipos de documentos de personas...</div>}>
          <TypesDocumentsViewWrapper optionChildrenProp="Persona" personas={true} equipos={false} hideTabs={true} />
        </Suspense>
      ),
    });
  }

  // Solo agregar tab de Equipos si corresponde
  if (!showOnlyPersonas) {
    allTabs.push({
      value: 'Equipos',
      label: (
        <span className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Equipos
        </span>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'tipos-docs-equipos' as const,
      content: (
        <Suspense fallback={<div>Cargando tipos de documentos de equipos...</div>}>
          <TypesDocumentsViewWrapper optionChildrenProp="Equipo" equipos={true} personas={false} hideTabs={true} />
        </Suspense>
      ),
    });
  }

  const defaultTab = showOnlyPersonas ? 'Personas' : showOnlyEquipos ? 'Equipos' : 'Personas';

  return (
    <div>
      {/* Botón crear está en la tab principal, no en subtabs */}
      <PermissionGuardServer module="documentacion" tab="tipos-de-documentos" action="create">
        <div className="flex gap-4 flex-wrap mb-4">
          <TypesDocumentAction optionChildrenProp={showOnlyPersonas ? 'Persona' : showOnlyEquipos ? 'Equipo' : 'all'} />
        </div>
      </PermissionGuardServer>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab={defaultTab}
        permissions={permissions}
        tabs={allTabs}
      />
    </div>
  );
}
