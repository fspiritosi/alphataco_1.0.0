import CovenantTreeFileWrapper from '@/app/dashboard/company/actualCompany/covenant/CovenantTreeFileWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DiagramTypeComponentWrapper from '@/features/Empresa/RRHH/components/Diagrams/DiagramTypeComponentWrapper';
import ContractTypeTabWrapper from '@/features/Empresa/RRHH/components/TypeContract/ContractTypeTabWrapper';
import { TabsManagerServer } from '@/features/TabsManager';
import { Award, Briefcase, Calendar, FileText, Layers, ScrollText } from 'lucide-react';
import AptitudesTab from './components/AptitudesTecnicas/aptitudesTab';
import PositionsTab from './components/CompanyPositions/positionsTab';
import DiagramTypesTabWrapper from './components/DiagramTypes/DiagramTypesTabWrapper';

export default function RrhhTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="listado"
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
                  <DiagramTypesTabWrapper />
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
                  <DiagramTypeComponentWrapper />
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
                  <CovenantTreeFileWrapper />
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
                  <ContractTypeTabWrapper />
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
                  <PositionsTab />
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
                  <AptitudesTab />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
