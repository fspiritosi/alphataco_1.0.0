import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import KpisTabContent from '@/features/Dashboard/Estadisticas/KPIs/KpisTabContent';
import { _CreateDocumentTypeButton } from '@/features/Documentacion/TiposDocumentos/components/_CreateDocumentTypeButton';
import CompanyDocsList from '@/features/Empresa/General/Documentacion/components/CompanyDocsList';
import { CompanyDocsTableSkeleton } from '@/features/Empresa/General/Documentacion/fallback/CompanyDocsTableSkeleton';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { document_applies } from '@/generated/prisma/enums';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { Building2, ChartColumn, DollarSign, FileText, Network, Users } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import UsersTabComponent from '../Usuarios/UsersTabComponent';
import CostCenterList from './CostCenter/CostCenterList';
import { CostCenterTableSkeleton } from './CostCenter/fallback/CostCenterTableSkeleton';
import HierarchyList from './Hierarchy/HierarchyList';
import { HierarchyTableSkeleton } from './Hierarchy/fallback/HierarchyTableSkeleton';
import CompanyComponent from './components/company/CompanyComponent';
import { CompanySkeleton } from './fallback/CompanySkeleton';
import { TableSubtabSkeleton } from './fallback/SubtabSkeletons';

export default async function GeneralTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  const company_id = await getActiveCompanyId();

  return (
    <div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="company"
        permissions={permissions}
        tabs={[
          {
            value: 'company',
            label: (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'company',
            content: (
              <Card>
                <CardHeader className="flex flex-row items-start bg-surface dark:bg-muted/50 border-b-2">
                  <div className="flex-1">
                    <CardTitle>Empresa</CardTitle>
                    <CardDescription>Información de la empresa</CardDescription>
                  </div>
                  <PermissionGuardServer module="configuracion" tab="general" action="update">
                    <Link
                      href={`/dashboard/configuration/companies/${company_id}`}
                      className={buttonVariants({ variant: 'brand' })}
                    >
                      Editar Empresa
                    </Link>
                  </PermissionGuardServer>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<CompanySkeleton />}>
                    <CompanyComponent />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'cost-center',
            label: (
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Centro de Costos
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'cost-center',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Centro de Costos</CardTitle>
                  <CardDescription>Gestión de centros de costos</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<CostCenterTableSkeleton />}>
                    <CostCenterList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'organigrama',
            label: (
              <span className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Organigrama
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'organigrama',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Organigrama</CardTitle>
                  <CardDescription>Estructura organizacional</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<HierarchyTableSkeleton />}>
                    <HierarchyList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'users',
            label: (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuarios
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'users',
            content: (
              <Suspense fallback={<TableSubtabSkeleton />}>
                <UsersTabComponent searchParams={searchParams} permissions={permissions} />
              </Suspense>
            ),
          },
          {
            value: 'kpis',
            label: (
              <span className="flex items-center gap-2">
                <ChartColumn className="h-4 w-4" />
                KPIs
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'kpis',
            content: (
              <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-md" />}>
                <KpisTabContent searchParams={searchParams} permissions={permissions} />
              </Suspense>
            ),
          },
          {
            value: 'documentacion',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentación
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'documentacion',
            content: (
              <div className="">
                <PermissionGuardServer module="configuracion" tab="documentacion" action="create">
                  <_CreateDocumentTypeButton defaultApplies={document_applies.Empresa} />
                </PermissionGuardServer>
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <Suspense fallback={<CompanyDocsTableSkeleton />}>
                      <CompanyDocsList searchParams={searchParams} />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
