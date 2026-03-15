import { Suspense } from 'react';
import { DiagramReportsList } from './Reports/DiagramReportsList';
import { DiagramReportsSkeleton } from './Reports/fallback/DiagramReportsSkeleton';

interface DiagramReportsWrapperProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function DiagramReportsWrapper({ searchParams }: DiagramReportsWrapperProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes de Diagramas</h2>
        <p className="text-muted-foreground">Consulta y analiza los datos de novedades diarias de los empleados.</p>
      </div>
      <Suspense fallback={<DiagramReportsSkeleton />}>
        <DiagramReportsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
