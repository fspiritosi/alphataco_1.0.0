import { Building2, Truck, User } from 'lucide-react';
import { Suspense } from 'react';

import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';

import { EmpresaList } from './EmpresaList/EmpresaList';
import { EquiposList } from './EquiposList/EquiposList';
import { PersonasList } from './PersonasList/PersonasList';
import { _CreateDocumentTypeButton } from './components/_CreateDocumentTypeButton';
import { TiposDocumentosSkeleton } from './fallback/TiposDocumentosSkeleton';

// ============================================
// TIPOS
// ============================================

interface TiposDocumentosTabContentProps {
  searchParams: DataTableSearchParams;
  showOnlyPersonas?: boolean;
  showOnlyEquipos?: boolean;
  showOnlyEmpresa?: boolean;
  permissions: Record<string, boolean>;
}

// ============================================
// COMPONENTE
// ============================================

export default async function TiposDocumentosTabContent({
  searchParams,
  showOnlyPersonas = false,
  showOnlyEquipos = false,
  showOnlyEmpresa = false,
  permissions,
}: TiposDocumentosTabContentProps) {
  const allTabs = [];

  if (!showOnlyEquipos && !showOnlyEmpresa) {
    allTabs.push({
      value: 'Personas',
      label: (
        <span className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Personas
        </span>
      ),
      moduleSlug: 'configuracion' as const,
      tabSlug: 'tipos-docs-personas' as const,
      content: (
        <Suspense fallback={<TiposDocumentosSkeleton />}>
          <PersonasList searchParams={searchParams} permissionsMap={permissions} />
        </Suspense>
      ),
    });
  }

  if (!showOnlyPersonas && !showOnlyEmpresa) {
    allTabs.push({
      value: 'Equipos',
      label: (
        <span className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Equipos
        </span>
      ),
      moduleSlug: 'configuracion' as const,
      tabSlug: 'tipos-docs-equipos' as const,
      content: (
        <Suspense fallback={<TiposDocumentosSkeleton />}>
          <EquiposList searchParams={searchParams} permissionsMap={permissions} />
        </Suspense>
      ),
    });
  }

  if (!showOnlyPersonas && !showOnlyEquipos) {
    allTabs.push({
      value: 'Empresa',
      label: (
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </span>
      ),
      moduleSlug: 'configuracion' as const,
      tabSlug: 'tipos-docs-empresa' as const,
      content: (
        <Suspense fallback={<TiposDocumentosSkeleton />}>
          <EmpresaList searchParams={searchParams} />
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
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab={defaultTab}
      permissions={permissions}
      actions={
        <PermissionGuardServer module="configuracion" tab="documentos" action="create">
          <_CreateDocumentTypeButton />
        </PermissionGuardServer>
      }
      tabs={allTabs}
    />
  );
}
