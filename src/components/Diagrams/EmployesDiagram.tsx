import { TabsManagerServer } from '@/features/TabsManager';
import { BarChart3, FileSpreadsheet, FolderOpen, Plus } from 'lucide-react';
import { Suspense } from 'react';
import DiagramFormUpdatedWrapper from './DiagramFormUpdatedWrapper';
import DiagramMassive from './DiagramMassive';
import { DiagramReportsWrapper } from './DiagramReportsWrapper';
import EmployesDiagramWrapper from './EmployesDiagramWrapper';

export default async function EmployesDiagram({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="old"
      permissions={permissions}
      tabs={[
        {
          value: 'old',
          label: (
            <span className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Diagramas Cargados
            </span>
          ),
          moduleSlug: 'empleados',
          tabSlug: 'old',
          content: (
            <Suspense fallback={<div>Cargando diagramas...</div>}>
              <EmployesDiagramWrapper />
            </Suspense>
          ),
        },
        {
          value: 'new',
          label: (
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Cargar Diagrama
            </span>
          ),
          moduleSlug: 'empleados',
          tabSlug: 'new',
          content: (
            <Suspense fallback={<div>Cargando formulario...</div>}>
              <DiagramFormUpdatedWrapper />
            </Suspense>
          ),
        },
        {
          value: 'massive_diagram',
          label: (
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Carga Masiva
            </span>
          ),
          moduleSlug: 'empleados',
          tabSlug: 'massive_diagram',
          content: (
            <Suspense fallback={<div>Cargando carga masiva...</div>}>
              <DiagramMassive />
            </Suspense>
          ),
        },
        {
          value: 'reports',
          label: (
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </span>
          ),
          moduleSlug: 'empleados',
          tabSlug: 'reports',
          content: (
            <Suspense fallback={<div>Cargando reportes...</div>}>
              <DiagramReportsWrapper />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
