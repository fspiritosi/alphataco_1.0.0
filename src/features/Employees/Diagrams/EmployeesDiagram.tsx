import { Skeleton } from '@/components/ui/skeleton';
import { TabsManagerServer } from '@/features/TabsManager';
import { BarChart3, FileSpreadsheet, FolderOpen, Plus } from 'lucide-react';
import { Suspense } from 'react';
import DiagramFormUpdatedWrapper from './DiagramFormUpdatedWrapper';
import DiagramMassive from './DiagramMassive';
import { DiagramReportsWrapper } from './DiagramReportsWrapper';
import EmployeesDiagramWrapper from './EmployeesDiagramWrapper';

export default async function EmployeesDiagram({
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
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-md" />}>
              <EmployeesDiagramWrapper searchParams={searchParams} />
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
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
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
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-md" />}>
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
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-md" />}>
              <DiagramReportsWrapper searchParams={searchParams} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
