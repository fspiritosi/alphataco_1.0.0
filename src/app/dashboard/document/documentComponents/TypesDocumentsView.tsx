'use client';
import { fetchAllDocumentTypes } from '@/app/server/GET/actions';
import { Card, CardContent } from '@/components/ui/card';
import { usePermissions } from '@/features/Permissions';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';
import { VisibilityState } from '@tanstack/react-table';
import { Truck, User } from 'lucide-react';
import { ReactNode, useState } from 'react';
import DocumentsTable from './DocumentsTable';
import FilterHeader from './FilterComponent';

function TypesDocumentsView({
  personas,
  equipos,
  empresa,
  tabValue,
  subtab,
  role,
  document_types,
  savedVisibility,
  savedFilters,
  optionChildrenProp,
  actionComponent,
}: {
  personas?: boolean;
  equipos?: boolean;
  empresa?: boolean;
  tabValue?: string;
  subtab?: string;
  role?: string;
  document_types: Awaited<ReturnType<typeof fetchAllDocumentTypes>>;
  savedVisibility: VisibilityState;
  savedFilters: string[];
  optionChildrenProp?: string;
  actionComponent?: ReactNode;
}) {
  const doc_personas = document_types?.filter((doc) => doc.applies === 'Persona').filter((e) => e.is_active);
  const doc_equipos = document_types?.filter((doc) => doc.applies === 'Equipos').filter((e) => e.is_active);
  const doc_empresa = document_types?.filter((doc) => doc.applies === 'Empresa').filter((e) => e.is_active);

  // Verificar permisos de edición para cada tipo
  const { hasPermission } = usePermissions();
  const canEditPersonas = hasPermission('empleados', 'tipos-docs-personas', 'update');
  const canEditEquipos = hasPermission('equipos', 'tipos-docs-equipos', 'update');

  const [filters, setFilters] = useState({
    personas: { name: '', multiresource: '', special: '', monthly: '', expired: '', mandatory: '', private: '' },
    equipos: { name: '', multiresource: '', special: '', monthly: '', expired: '', mandatory: '', private: '' },
    empresa: { name: '', multiresource: '', special: '', monthly: '', expired: '', mandatory: '', private: '' },
  });

  const handleFilterChange = (type: 'personas' | 'equipos' | 'empresa', filterName: string, value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [type]: { ...prevFilters[type], [filterName]: value },
    }));
  };

  const applyFilters = (
    docs: typeof doc_personas | typeof doc_equipos | typeof doc_empresa,
    type: 'personas' | 'equipos' | 'empresa'
  ) => {
    const filter = filters[type];
    return docs?.filter((doc) => {
      const matchesName = doc.name.toLowerCase().includes(filter.name.toLowerCase());
      const matchesMultiresource =
        filter.multiresource === '' || (filter.multiresource === 'Si' ? doc.multiresource : !doc.multiresource);
      const matchesSpecial = filter.special === '' || (filter.special === 'Si' ? doc.special : !doc.special);
      const matchesMonthly =
        filter.monthly === '' || (filter.monthly === 'Si' ? doc.is_it_montlhy : !doc.is_it_montlhy);
      const matchesExpired = filter.expired === '' || (filter.expired === 'Si' ? doc.explired : !doc.explired);
      const matchesMandatory = filter.mandatory === '' || (filter.mandatory === 'Si' ? doc.mandatory : !doc.mandatory);
      const matchesPrivate = filter.private === '' || (filter.private === 'Si' ? doc.private : !doc.private);

      return (
        matchesName &&
        matchesMultiresource &&
        matchesSpecial &&
        matchesMonthly &&
        matchesExpired &&
        matchesMandatory &&
        matchesPrivate
      );
    });
  };

  const filteredDocPersonas = applyFilters(doc_personas, 'personas');
  const filteredDocEquipos = applyFilters(doc_equipos, 'equipos');
  const filteredDocEmpresa = applyFilters(doc_empresa, 'empresa');

  const convertToOptions = (array: any) =>
    Array.from(new Set(array?.map((val: any) => (val === true ? 'Si' : 'No')))).filter((val: any) => val !== undefined);

  const docOptions = {
    multiresource: convertToOptions(document_types?.map((doc: any) => doc.multiresource)),
    special: convertToOptions(document_types?.map((doc: any) => doc.special)),
    monthly: convertToOptions(document_types?.map((doc) => doc.is_it_montlhy)),
    expired: convertToOptions(document_types?.map((doc) => doc.explired)),
    mandatory: convertToOptions(document_types?.map((doc) => doc.mandatory)),
    private: convertToOptions(document_types?.map((doc) => doc.private)),
  };

  const optionValue =
    personas && equipos && empresa ? 'Personas' : personas ? 'Personas' : equipos ? 'Equipos' : 'Empresa';

  const tabs = [] as any[];

  if (personas) {
    tabs.push({
      value: 'Personas',
      label: (
        <span className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Personas ({filteredDocPersonas?.length || 0})
        </span>
      ),
      moduleSlug: 'empleados' as const,
      tabSlug: 'tipos-docs-personas' as const,
      content: (
        <Card className="p-6">
          <DocumentsTable
            data={filteredDocPersonas || []}
            filters={filters.personas}
            savedFilters={savedFilters}
            savedVisibility={savedVisibility}
            canEdit={canEditPersonas}
          >
            <FilterHeader
              filters={filters.personas}
              docOptions={docOptions as any}
              onFilterChange={(name, value) => handleFilterChange('personas', name, value)}
            />
          </DocumentsTable>
        </Card>
      ),
    });
  }

  if (equipos) {
    tabs.push({
      value: 'Equipos',
      label: (
        <span className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Equipos ({filteredDocEquipos?.length || 0})
        </span>
      ),
      moduleSlug: 'equipos' as const,
      tabSlug: 'tipos-docs-equipos' as const,
      content: (
        <Card className="p-6">
          <DocumentsTable
            savedVisibility={savedVisibility}
            savedFilters={savedFilters}
            data={filteredDocEquipos || []}
            filters={filters.equipos}
            canEdit={canEditEquipos}
          >
            <FilterHeader
              filters={filters.equipos}
              docOptions={docOptions as any}
              onFilterChange={(name, value) => handleFilterChange('equipos', name, value)}
            />
          </DocumentsTable>
        </Card>
      ),
    });
  }

  // Empresa tab removed - no existe en el sistema de permisos

  return (
    <CardContent className="px-0 pt-1">
      <div className="mb-4">{actionComponent}</div>
      <TabsManagerClientSide tabs={tabs} paramName="subtab" defaultTab={optionValue} listClassName="w-fit bg-muted" />
    </CardContent>
  );
}

export default TypesDocumentsView;
