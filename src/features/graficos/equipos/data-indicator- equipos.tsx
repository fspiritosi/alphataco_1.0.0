import { getEmployeeIndicator, getVehiclesDisponibleFilterType } from '@/app/server/GET/actions';
import { cookies } from 'next/headers';

export default async function EquipmentChart() {
  const cookiesStore = cookies();

  const employeeIndicator = await getEmployeeIndicator(['2e5d7af8-615c-4b23-b4f9-801b03a83652'], false);
  console.log(employeeIndicator, 'indicator');
  // const condiciones_indicadores = {
  //   'success': 75,
  //   'warning': 50,
  //   'destructive': 25
  // }

  // const diagrams_types = await fetchDiagramsTypes();
  // //console.log(diagrams_types, 'diagrams_types');
  // const novedades = diagrams_types.map((diagram_type) => ({
  //   id: diagram_type.id,
  //   name: diagram_type.name,
  //   color: diagram_type.color,
  // }));
  // const diagrams_day = await getDiagramsDay();
  const active_vehicles = await getVehiclesDisponibleFilterType();
  // const date: string = moment().format('DD-MM-YYYY');
  // const dateFilter: string = moment().format('YYYY-MM-DD');

  // const diagramasCount = diagrams_day?.reduce((acc: Record<string, number>, diagram) => {
  //   const id = diagram.diagram_type?.id;
  //   if (id) {
  //     acc[id] = (acc[id] || 0) + 1;
  //   }
  //   return acc;
  // }, {});

  // const diagramas = diagramasCount ? Object.entries(diagramasCount).map(([id, cantidad]) => ({ id, cantidad })) : [];

  // const chartData = novedades
  //   .map((novedad) => {
  //     const cantidad = diagramas.find((diagram) => diagram.id === novedad.id)?.cantidad || 0;
  //     return { novedad: novedad.name, empleados: cantidad, fill: novedad.color };
  //   })
  //   .filter((item) => item.empleados > 0);

  // const empleadosTotal = chartData.reduce((acc, curr) => acc + curr.empleados, 0);

  // if (active_employees && empleadosTotal < active_employees) {
  //   chartData.push({
  //     novedad: 'Sin diagrama',
  //     empleados: active_employees - empleadosTotal,
  //     fill: '#e74c3c',
  //   });
  // }

  // // Generar chartConfig dinámicamente a partir de chartData
  // const chartConfig = {
  //   empleados: { label: 'Novedades' },
  //   ...chartData
  //     .filter((item) => item.empleados > 0)
  //     .reduce(
  //       (acc, item) => {
  //         acc[item.novedad!] = { label: item.novedad!, color: item.fill };
  //         return acc;
  //       },
  //       {} as Record<string, { label: string; color: string }>
  //     ),
  // };

  // const usageEmployees= await getUniqueEmployeeCountByDate(dateFilter);
  // const diagramActiveEmployees = diagrams_day?.filter((diagram) => diagram.diagram_type?.work_active)?.length;

  // let disponibleEmployeesNumber = 0;
  // let disponibleEmployeesPorcent = 0;

  // if(diagramActiveEmployees && diagramActiveEmployees > 0 && usageEmployees.count >= 0){
  //   disponibleEmployeesNumber = diagramActiveEmployees - usageEmployees.count;
  //   disponibleEmployeesPorcent = (disponibleEmployeesNumber / diagramActiveEmployees) * 100;
  // }

  // const indicatorCharData = [{ operative: usageEmployees.count, available: disponibleEmployeesNumber }];

  // const indicatorChartConfig = {
  //   operative: {
  //     label: "En Operación",
  //     color: "#34C759",
  //   },
  //   available: {
  //     label: "Disponibles",
  //     color: "#e74c3c",
  //   },
  // } satisfies ChartConfig;

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
