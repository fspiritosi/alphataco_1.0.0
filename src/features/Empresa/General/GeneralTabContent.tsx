import TypesDocumentAction from '@/app/dashboard/document/documentComponents/TypesDocumentAction';
import DocumentTabComponent from '@/components/DocumentTabComponent';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Building2, DollarSign, FileText, Network, Users, Wrench } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import UsersTabComponent from '../Usuarios/UsersTabComponent';
import { CreateUserModal } from '../Usuarios/components/create-user-modal';
import CompanyComponent from './components/company/CompanyComponent';
import CostCenterTab from './components/cost-center/CostCenterTab';
import MantenimientoTab from './components/mantenimiento/MantenimientoTab';
import OrganigramTabWrapper from './components/organigrama/OrganigramTabWrapper';

export default async function GeneralTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

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
            moduleSlug: 'empresa',
            tabSlug: 'company',
            content: (
              <Card>
                <CardHeader className="flex flex-row items-start bg-gh dark:bg-muted/50 border-b-2">
                  <div className="flex-1">
                    <CardTitle>Empresa</CardTitle>
                    <CardDescription>Información de la empresa</CardDescription>
                  </div>
                  {/* <EditCompanyButton companyId={company_id?.toString() ?? ''} /> */}
                  <PermissionGuardServer module="empresa" tab="general" action="update">
                    <Link
                      href={`/dashboard/company/${company_id?.toString()}`}
                      className={buttonVariants({ variant: 'gh_orange' })}
                    >
                      Editar Empresa
                    </Link>
                  </PermissionGuardServer>
                </CardHeader>
                <CardContent className="pt-6">
                  <CompanyComponent />
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
            moduleSlug: 'empresa',
            tabSlug: 'cost-center',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Centro de Costos</CardTitle>
                  <CardDescription>Gestión de centros de costos</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <CostCenterTab />
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
            moduleSlug: 'empresa',
            tabSlug: 'organigrama',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Organigrama</CardTitle>
                  <CardDescription>Estructura organizacional</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <OrganigramTabWrapper />
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
            moduleSlug: 'empresa',
            tabSlug: 'users',
            content: (
              <div>
                <PermissionGuardServer module="empresa" tab="usuarios-empleados" action="create">
                  <CreateUserModal />
                </PermissionGuardServer>
                <UsersTabComponent searchParams={searchParams} permissions={permissions} />
              </div>
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
            moduleSlug: 'empresa',
            tabSlug: 'documentacion',
            content: (
              <div className="">
                <PermissionGuardServer module="empresa" tab="documentacion" action="create">
                  <TypesDocumentAction optionChildrenProp="Empresa" />
                </PermissionGuardServer>
                <DocumentTabComponent />
              </div>
            ),
          },
          {
            value: 'mantenimiento',
            label: (
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Mantenimiento
              </span>
            ),
            moduleSlug: 'empresa',
            tabSlug: 'empresa-mantenimiento',
            content: (
              <Card>
                <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
                  <CardTitle>Mantenimiento</CardTitle>
                  <CardDescription>Gestión de talleres y sectores</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <MantenimientoTab />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
