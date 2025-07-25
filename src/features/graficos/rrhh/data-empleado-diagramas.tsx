import { fetchDiagramsTypes, getActiveEmployees, getDiagramsDay, getEmployeeIndicator } from '@/app/server/GET/actions';
import moment from 'moment';

import { Empleados_diagramas } from './empleados-diagramas';

import { ChartConfig } from '@/components/ui/chart';
import IndicatorCard from './indicatorCard';

export default async function EmpleadoDiagramasChart() {
  const condiciones_indicadores = {
    success: 75,
    warning: 50,
    destructive: 25,
  };

  const diagrams_types = await fetchDiagramsTypes();

  const novedades = diagrams_types.map((diagram_type) => ({
    id: diagram_type.id,
    name: diagram_type.name,
    color: diagram_type.color,
  }));
  const diagrams_day = await getDiagramsDay();
  const active_employees = await getActiveEmployees();
  const date: string = moment().format('DD-MM-YYYY');

  const diagramasCount = diagrams_day?.reduce((acc: Record<string, number>, diagram) => {
    const id = diagram.diagram_type?.id;
    if (id) {
      acc[id] = (acc[id] || 0) + 1;
    }
    return acc;
  }, {});

  const diagramas = diagramasCount ? Object.entries(diagramasCount).map(([id, cantidad]) => ({ id, cantidad })) : [];

  const chartData = novedades
    .map((novedad) => {
      const cantidad = diagramas.find((diagram) => diagram.id === novedad.id)?.cantidad || 0;
      return { novedad: novedad.name, empleados: cantidad, fill: novedad.color };
    })
    .filter((item) => item.empleados > 0);

  const empleadosTotal = chartData.reduce((acc, curr) => acc + curr.empleados, 0);

  if (active_employees && empleadosTotal < active_employees) {
    chartData.push({
      novedad: 'Sin diagrama',
      empleados: active_employees - empleadosTotal,
      fill: '#e74c3c',
    });
  }

  // Generar chartConfig dinámicamente a partir de chartData
  const chartConfig = {
    empleados: { label: 'Novedades' },
    ...chartData
      .filter((item) => item.empleados > 0)
      .reduce(
        (acc, item) => {
          acc[item.novedad!] = { label: item.novedad!, color: item.fill };
          return acc;
        },
        {} as Record<string, { label: string; color: string }>
      ),
  };

  const employeeIndicator = await getEmployeeIndicator();

  const indicatorCharData = [
    { operative: employeeIndicator![0].employees_used, available: employeeIndicator![0].employees_operativos },
  ];
  const indicatorChartConfig = {
    operative: {
      label: 'En Operación',
      color: '#34C759',
    },
    available: {
      label: 'Disponibles',
      color: '#e74c3c',
    },
  } satisfies ChartConfig;

  return (
    <section className="grid grid-cols-2 gap-4">
      <div className="col-span-1">
        <Empleados_diagramas chartData={chartData} chartConfig={chartConfig} date={date} />
      </div>
      <div className="col-span-1">
        <div className="flex  h-full ">
          <IndicatorCard
            disponibleEmployeesPorcent={employeeIndicator![0].indicator}
            disponibleEmployeesNumber={
              employeeIndicator![0].employees_operativos - employeeIndicator![0].employees_used
            }
            diagramActiveEmployees={employeeIndicator![0].employees_operativos}
            indicatorCharData={indicatorCharData}
            indicatorChartConfig={indicatorChartConfig}
            condiciones_indicadores={condiciones_indicadores}
            usageEmployees={employeeIndicator![0].employees_used}
          />
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
