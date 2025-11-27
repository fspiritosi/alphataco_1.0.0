import TypesDocumentAction from '@/app/dashboard/document/documentComponents/TypesDocumentAction';
import DocumentTabComponent from '@/components/DocumentTabComponent';
import EditCompanyButton from '@/components/EditCompanyButton';
import { RegisterWithRole } from '@/components/RegisterWithRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsManagerServer } from '@/features/TabsManager';
import { Building2, DollarSign, FileText, Network, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import UsersTabComponent from '../Usuarios/UsersTabComponent';
import CompanyComponent from './components/company/CompanyComponent';
import CostCenterTab from './components/cost-center/CostCenterTab';
import OrganigramTabWrapper from './components/organigrama/OrganigramTabWrapper';

export default async function GeneralTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  return (
    <div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="company"
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
                  <EditCompanyButton companyId={company_id?.toString() ?? ''} />
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
              <Card>
                <CardHeader className="flex flex-row items-start bg-gh dark:bg-muted/50 border-b-2">
                  <div className="flex-1">
                    <CardTitle>Usuarios</CardTitle>
                    <CardDescription>Gestión de usuarios de la empresa</CardDescription>
                  </div>
                  <RegisterWithRole />
                </CardHeader>
                <CardContent className="pt-6">
                  <UsersTabComponent searchParams={searchParams} />
                </CardContent>
              </Card>
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
              <Card>
                <CardHeader className="flex flex-row items-start bg-gh dark:bg-muted/50 border-b-2">
                  <div className="flex-1">
                    <CardTitle>Documentos empresa</CardTitle>
                    <CardDescription>Documentos a nombre de la empresa</CardDescription>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <TypesDocumentAction optionChildrenProp="Empresa" />
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <DocumentTabComponent />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
