import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeExpiringDocsList } from '@/features/Dashboard/Documentacion/Empleados/EmployeeExpiringDocsList';
import { VehicleExpiringDocsList } from '@/features/Dashboard/Documentacion/Vehiculos/VehicleExpiringDocsList';
import { TabsManagerServer } from '@/features/TabsManager';
import { Truck, Users } from 'lucide-react';
import { Suspense } from 'react';

function DocumentsTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      <section>
        <Card className="flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="flex flex-row items-start bg-surface dark:bg-muted/50 border-b-2">
              <div className="gap-1">
                <CardTitle className="flex items-center text-lg">Proximos vencimientos</CardTitle>
                <CardDescription className="capitalize">Documentos que vencen en los proximos 30 dias</CardDescription>
              </div>
            </CardHeader>

            <div className="p-4">
              <TabsManagerServer
                paramName="subtab"
                searchParams={searchParams}
                defaultTab="empleados"
                permissions={permissions}
                tabs={[
                  {
                    value: 'empleados',
                    label: (
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Empleados
                      </span>
                    ),
                    moduleSlug: 'dashboard',
                    tabSlug: 'empleados',
                    content: (
                      <Suspense
                        fallback={
                          <div className="space-y-3 p-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-64 w-full" />
                          </div>
                        }
                      >
                        <EmployeeExpiringDocsList searchParams={searchParams} />
                      </Suspense>
                    ),
                  },
                  {
                    value: 'vehiculos',
                    label: (
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Vehículos
                      </span>
                    ),
                    moduleSlug: 'dashboard',
                    tabSlug: 'vehiculos',
                    content: (
                      <Suspense
                        fallback={
                          <div className="space-y-3 p-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-64 w-full" />
                          </div>
                        }
                      >
                        <VehicleExpiringDocsList searchParams={searchParams} />
                      </Suspense>
                    ),
                  },
                ]}
              />
            </div>
          </div>
          <CardFooter className="flex flex-row items-center border-t bg-surface dark:bg-muted/50 px-6 py-3"></CardFooter>
        </Card>
      </section>
    </section>
  );
}

export default DocumentsTabContent;
