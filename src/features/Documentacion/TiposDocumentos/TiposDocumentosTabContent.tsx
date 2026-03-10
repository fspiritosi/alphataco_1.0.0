import TypesDocumentAction from '@/app/dashboard/document/documentComponents/TypesDocumentAction';
import TypesDocumentsViewWrapper from '@/app/dashboard/document/documentComponents/TypesDocumentsViewWrapper';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Building2, Truck, User } from 'lucide-react';
import { Suspense } from 'react';

export default async function TiposDocumentosTabContent({
  searchParams,
  showOnlyPersonas = false,
  showOnlyEquipos = false,
  showOnlyEmpresa = false,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  showOnlyPersonas?: boolean;
  showOnlyEquipos?: boolean;
  showOnlyEmpresa?: boolean;
  permissions: Record<string, boolean>;
}) {
  const allTabs = [];

  // Solo agregar tab de Personas si corresponde
  if (!showOnlyEquipos && !showOnlyEmpresa) {
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
  if (!showOnlyPersonas && !showOnlyEmpresa) {
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

  // Solo agregar tab de Empresa si corresponde
  if (!showOnlyPersonas && !showOnlyEquipos) {
    allTabs.push({
      value: 'Empresa',
      label: (
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </span>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'tipos-docs-empresa' as const,
      content: (
        <Suspense fallback={<div>Cargando tipos de documentos de empresa...</div>}>
          <TypesDocumentsViewWrapper
            optionChildrenProp="Empresa"
            empresa={true}
            personas={false}
            equipos={false}
            hideTabs={true}
          />
        </Suspense>
      ),
    });
  }

  const defaultTab = showOnlyPersonas
    ? 'Personas'
    : showOnlyEquipos
      ? 'Equipos'
      : showOnlyEmpresa
        ? 'Empresa'
        : 'Personas';

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
