import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CovenantTreeFileWrapper from '@/features/Empresa/CCT/components/CovenantTreeFileWrapper';
import ContractTypeList from '@/features/Empresa/RRHH/ContractTypes/ContractTypeList';
import { ContractTypeTableSkeleton } from '@/features/Empresa/RRHH/ContractTypes/fallback/ContractTypeTableSkeleton';
import DiagramTypeList from '@/features/Empresa/RRHH/DiagramTypes/DiagramTypeList';
import { DiagramTypeTableSkeleton } from '@/features/Empresa/RRHH/DiagramTypes/fallback/DiagramTypeTableSkeleton';
import { TabsManagerServer } from '@/features/TabsManager';
import { Award, Briefcase, Calendar, FileText, Layers, ScrollText } from 'lucide-react';
import { Suspense } from 'react';
import AptitudesList from './AptitudesTecnicas/AptitudesList';
import { AptitudesTableSkeleton } from './AptitudesTecnicas/fallback/AptitudesTableSkeleton';
import PositionsList from './Positions/PositionsList';
import { PositionsTableSkeleton } from './Positions/fallback/PositionsTableSkeleton';
import WorkDiagramList from './WorkDiagrams/WorkDiagramList';
import { WorkDiagramTableSkeleton } from './WorkDiagrams/fallback/WorkDiagramTableSkeleton';
import { CctSubtabSkeleton } from './fallback/RrhhSubtabSkeleton';

export default function RrhhTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="listado"
        permissions={permissions}
        tabs={[
          {
            value: 'listado',
            label: (
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Tipos de Diagramas
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'listado',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Tipos de Diagramas</CardTitle>
                  <CardDescription>Gestión de tipos de diagramas</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<WorkDiagramTableSkeleton />}>
                    <WorkDiagramList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'diagrams',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tipos de Novedades
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'diagrams',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Tipos de Novedades</CardTitle>
                  <CardDescription>Gestión de tipos de novedades</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<DiagramTypeTableSkeleton />}>
                    <DiagramTypeList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'convenios',
            label: (
              <span className="flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                CCT
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'convenios',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Convenios Colectivos de Trabajo</CardTitle>
                  <CardDescription>Gestión de CCT</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<CctSubtabSkeleton />}>
                    <CovenantTreeFileWrapper />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'contract-types',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tipos de Contrato
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'contract-types',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Tipos de Contrato</CardTitle>
                  <CardDescription>Gestión de tipos de contrato</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<ContractTypeTableSkeleton />}>
                    <ContractTypeList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'positions',
            label: (
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Puestos
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'positions',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Puestos</CardTitle>
                  <CardDescription>Gestión de puestos de trabajo</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<PositionsTableSkeleton />}>
                    <PositionsList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'aptitudes',
            label: (
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                APT
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'aptitudes',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Aptitudes Técnicas</CardTitle>
                  <CardDescription>Gestión de aptitudes técnicas</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<AptitudesTableSkeleton />}>
                    <AptitudesList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
