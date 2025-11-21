import CardsGrid from '@/app/dashboard/componentDashboard/CardsGrid';
import DocumentsTableServerWrapper from '@/app/dashboard/componentDashboard/DocumentsTableServerWrapper';
import EmployeesTableServerWrapper from '@/app/dashboard/componentDashboard/EmployeesTableServerWrapper';
import { MissingDocumentList } from '@/components/MissingDocumentList';
import DashboardSkeleton from '@/components/Skeletons/DashboardSkeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AbsenteeismDashboard } from '@/features/Dashboard/Estadisticas/RecursosHumanos/absenteeism-dashboard';
import { TabsManagerServer } from '@/features/TabsManager';
import FeatureFlagShow from '@/shared/components/posthug/FeatureFlagShow';
import { Suspense } from 'react';
import OperacionesTabContent from './OperacionesTabContent';
import PrincipalTabContent from './PrincipalTabContent';

export default function DashboardComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="px-6">
      <section className="grid sm:grid-cols-2 grid-cols-1 gap-6 mx-7">
        {false && <CardsGrid />}
        {/* <CardTitle className="text-[2vw]">Bienvenido a tu dashboard</CardTitle> */}
      </section>

      {/* Main Tabs con TabsManagerServer */}
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="principal"
        dependentParams={['subtab']} // Limpia 'subtab' al cambiar de tab principal
        tabs={[
          {
            value: 'principal',
            label: 'Principal',
            content: (
              <Suspense fallback={<DashboardSkeleton />}>
                <PrincipalTabContent />
              </Suspense>
            ),
          },
          {
            value: 'documentacion',
            label: 'Documentacion',
            content: (
              <section className="md:mx-7 grid grid-cols-1 mt-6 xl:grid-cols-4 gap-3 mb-4 ">
                <section className="flex flex-col gap-4 w-full">
                  <MissingDocumentList />
                </section>
                <section className="col-span-3">
                  <Card className=" flex flex-col justify-between overflow-hidden">
                    <div>
                      <CardHeader className="flex flex-row items-start bg-gh dark:bg-muted/50 border-b-2">
                        <div className="gap-1">
                          <CardTitle className="flex items-center text-lg ">Proximos vencimientos</CardTitle>
                          <CardDescription className="capitalize">
                            Documentos que vencen en los proximos 30 dias
                          </CardDescription>
                        </div>
                      </CardHeader>

                      <CardContent></CardContent>
                      <div>
                        {/* Nested Tabs para Empleados/Vehiculos */}
                        <TabsManagerServer
                          paramName="subtab"
                          searchParams={searchParams}
                          defaultTab="empleados"
                          tabs={[
                            {
                              value: 'empleados',
                              label: 'Empleados',
                              content: <EmployeesTableServerWrapper />,
                            },
                            {
                              value: 'vehiculos',
                              label: 'Vehiculos',
                              content: <DocumentsTableServerWrapper />,
                            },
                          ]}
                        />
                      </div>
                    </div>
                    <CardFooter className="flex flex-row items-center border-t bg-gh dark:bg-muted/50 px-6 py-3"></CardFooter>
                  </Card>
                </section>
              </section>
            ),
          },
          {
            value: 'estadisticas',
            label: 'Estadisticas',
            // TODO: Implementar validación de roles aquí (FeatureFlag o Rol directo)
            content: (
              <FeatureFlagShow featureFlagName="mostrar_tab_de_graficos_en_dashboard">
                {/* Nested Tabs para Estadísticas */}
                <TabsManagerServer
                  paramName="subtab"
                  searchParams={searchParams}
                  defaultTab="operaciones"
                  tabs={[
                    {
                      value: 'operaciones',
                      label: 'Operaciones',
                      content: (
                        <Suspense fallback={<div>Cargando operaciones...</div>}>
                          <OperacionesTabContent />
                        </Suspense>
                      ),
                    },
                    {
                      value: 'rrhh',
                      label: 'RRHH',
                      content: (
                        <Card className="md:mx-7 grid grid-cols-1 mt-6 gap-3 mb-4 p-4">
                          <AbsenteeismDashboard />
                        </Card>
                      ),
                    },
                    {
                      value: 'mantenimiento',
                      label: 'Mantenimiento',
                      content: (
                        <section className="md:mx-7 grid grid-cols-1 mt-6 gap-3 mb-4">
                          {/* Maintenance statistics content will go here */}
                        </section>
                      ),
                    },
                  ]}
                />
              </FeatureFlagShow>
            ),
          },
        ]}
      />
    </div>
  );
}
