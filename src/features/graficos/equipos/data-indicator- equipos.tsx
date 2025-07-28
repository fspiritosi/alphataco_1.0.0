import { getEmployeeIndicator, getVehiclesDisponibleFilterType } from '@/app/server/GET/actions';
import { cookies } from 'next/headers';

export default async function EquipmentChart() {
  const cookiesStore = cookies();

  const employeeIndicator = await getEmployeeIndicator(['2e5d7af8-615c-4b23-b4f9-801b03a83652'], false);
  console.log(employeeIndicator, 'indicator');

  const active_vehicles = await getVehiclesDisponibleFilterType();

  return (
    <section className="grid grid-cols-2 gap-4">
      <div className="col-span-1">
        <div className="flex  h-full ">
          {active_vehicles.count}
          {/* <IndicatorCard disponibleEmployeesPorcent={disponibleEmployeesPorcent} disponibleEmployeesNumber={disponibleEmployeesNumber} diagramActiveEmployees={diagramActiveEmployees} indicatorCharData={indicatorCharData} indicatorChartConfig={indicatorChartConfig} condiciones_indicadores={condiciones_indicadores} usageEmployees={usageEmployees}/> */}
        </div>
      </div>
    </section>
    // <section className="md:mx-7 grid grid-cols-1 mt-6 xl:grid-cols-3 gap-3 mb-4 max-h-[400px] ">
    //   <section className="flex flex-col gap-4 col-span-1">
    //   <Empleados_diagramas chartData={chartData} chartConfig={chartConfig} date={date} />
    //   </section>
    //   <section className="col-span-2">
    //     <ChartAreaInteractive/>
    //   </section>
    //   {/* <Card className="col-span-3 flex flex-col justify-between overflow-hidden">
    //     <div>
    //       <CardHeader className="flex flex-row items-start bg-gh dark:bg-muted/50 border-b-2">
    //         <div className="grid gap-1">
    //           <CardTitle className="flex items-center text-lg ">Proximos vencimientos</CardTitle>
    //           <CardDescription className="capitalize">
    //             Documentos que vencen en los proximos 30 dias
    //           </CardDescription>
    //         </div>
    //       </CardHeader>

    //       <CardContent></CardContent>
    //       <div>

    //       </div>
    //     </div>
    //     <CardFooter className="flex flex-row items-center border-t bg-gh dark:bg-muted/50 px-6 py-3"></CardFooter>
    //   </Card> */}
    // </section>
  );
}
