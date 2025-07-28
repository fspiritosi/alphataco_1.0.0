import { getDiagramIndicator, getEmployeeIndicator } from '@/app/server/GET/actions';
import moment from 'moment';

import { Empleados_diagramas } from './empleados-diagramas';

import { ChartConfig } from '@/components/ui/chart';
import IndicatorCard from './indicatorCard';

interface DiagramIndicator {
  diagram_type_id: string;
  diagram_type_name: string;
  diagram_type_color: string;
  cantidad_empleados: number;
}

export default async function EmpleadoDiagramasChart() {
  const employeeIndicator = await getEmployeeIndicator();
  const diagramIndicator: any = await getDiagramIndicator();

  const condiciones_indicadores = {
    success: 75,
    warning: 50,
    destructive: 25,
  };

  const date: string = moment().format('DD-MM-YYYY');

  const newChartData = diagramIndicator?.map((diagramIndicator: any) => {
    return {
      novedad: diagramIndicator.diagram_type_name,
      empleados: diagramIndicator.cantidad_empleados,
      fill: diagramIndicator.diagram_type_color,
    };
  });

  // Generar chartConfig dinámicamente a partir de chartData
  const chartConfig = {
    empleados: { label: 'Novedades' },
    ...newChartData
      .filter((item: any) => item.empleados > 0)
      .reduce(
        (acc: any, item: any) => {
          acc[item.novedad!] = { label: item.novedad!, color: item.fill };
          return acc;
        },
        {} as Record<string, { label: string; color: string }>
      ),
  };

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
        <Empleados_diagramas chartData={newChartData} chartConfig={chartConfig} date={date} />
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
  );
}
