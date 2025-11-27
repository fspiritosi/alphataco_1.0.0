import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentsTableServerWrapper from '@/features/Dashboard/Documentacion/components/DocumentsTableServerWrapper';
import EmployeesTableServerWrapper from '@/features/Dashboard/Documentacion/components/EmployeesTableServerWrapper';
import { TabsManagerServer } from '@/features/TabsManager';
import { Truck, Users } from 'lucide-react';
import { MissingDocumentList } from './components/MissingDocumentList';

function DocumentsTabContent({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <section className=" grid grid-cols-1 xl:grid-cols-4 gap-3 mb-4 ">
      <section className="flex flex-col gap-4 w-full">
        <MissingDocumentList />
      </section>
      <section className="col-span-3">
        <Card className=" flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="flex flex-row items-start bg-gh dark:bg-muted/50 border-b-2">
              <div className="gap-1">
                <CardTitle className="flex items-center text-lg ">Proximos vencimientos</CardTitle>
                <CardDescription className="capitalize">Documentos que vencen en los proximos 30 dias</CardDescription>
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
                    label: (
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Empleados
                      </span>
                    ),
                    moduleSlug: 'dashboard',
                    tabSlug: 'empleados',
                    content: <EmployeesTableServerWrapper />,
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
  );
}

export default DocumentsTabContent;
