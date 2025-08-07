import CardsGrid from '@/app/dashboard/componentDashboard/CardsGrid';
import DocumentsTable from '@/app/dashboard/componentDashboard/DocumentsTable';
import EmployeesTable from '@/app/dashboard/componentDashboard/EmployeesTable';
import { ResoursesChart } from '@/components/Graficos/ResousrsesChart';
import { MissingDocumentList } from '@/components/MissingDocumentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EquipmentChart from '@/features/graficos/equipos/data-indicator- equipos';
import EmpleadoDiagramasChart from '@/features/graficos/rrhh/data-empleado-diagramas';
import { fetchAllEmployeesCount, fetchAllVehiclesCount } from '@/shared/actions/employees.actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export default async function DashboardComponent() {
  const employees = fetchAllEmployeesCount();
  const equipments = fetchAllVehiclesCount();

  return (
    <div className="">
      <section className="grid sm:grid-cols-2 grid-cols-1 gap-6 mx-7">
        {false && <CardsGrid />}
        {/* <CardTitle className="text-[2vw]">Bienvenido a tu dashboard</CardTitle> */}
      </section>
      <Tabs defaultValue="Principal" className="w-full">
        <TabsList className="ml-6">
          <TabsTrigger value="Principal">Principal</TabsTrigger>
          <TabsTrigger value="Documentacion">Documentacion</TabsTrigger>
          {/* <TabsTrigger value="Empleados">Empleados</TabsTrigger> */}
          {/* <TabsTrigger value="Mantenimiento">Mantenimiento</TabsTrigger> */}
        </TabsList>
        <TabsContent className="w-full" value="Principal">
          <section className="md:mx-7 grid grid-cols-1 mt-6 xl:grid-cols-4 gap-3 mb-4 ">
            <section className="flex flex-col gap-4 w-full">
              <ResoursesChart employees={employees} equipments={equipments} />
            </section>
            <section className="col-span-3">
              <section className="flex flex-col gap-4 w-full">
                <EmpleadoDiagramasChart />
                <EquipmentChart />
              </section>
            </section>
          </section>
        </TabsContent>
        <TabsContent className="w-full" value="Documentacion">
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
                    <Tabs defaultValue="Empleados">
                      <CardContent className="pb-0 pl-4">
                        <TabsList>
                          <TabsTrigger value="Empleados">Empleados</TabsTrigger>
                          <TabsTrigger value="Vehiculos">Vehiculos</TabsTrigger>
                        </TabsList>
                      </CardContent>
                      <TabsContent value="Empleados">
                        <EmployeesTable />
                      </TabsContent>
                      <TabsContent value="Vehiculos">
                        <DocumentsTable />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
                <CardFooter className="flex flex-row items-center border-t bg-gh dark:bg-muted/50 px-6 py-3"></CardFooter>
              </Card>
            </section>
          </section>
        </TabsContent>
        {/* <TabsContent value="Empleados">
          <div className="flex flex-col justify-center">
            <EmpleadoDiagramasChart />
          </div>
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
