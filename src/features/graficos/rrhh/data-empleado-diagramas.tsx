import { getDiagramIndicator, getEmployeeIndicator } from '@/app/server/GET/actions';
import { ChartConfig } from '@/components/ui/chart';
import { fetchAllPositions } from '@/features/Empresa/RRHH/actions/actions';
import moment from 'moment';
import { cookies } from 'next/headers';
import { Empleados_diagramas } from './empleados-diagramas';
import IndicatorCard from './indicatorCard';
import { PositionFilter } from './positionsFilters';

interface DiagramIndicator {
  diagram_type_id: string;
  diagram_type_name: string;
  diagram_type_color: string;
  cantidad_empleados: number;
}

export default async function EmpleadoDiagramasChart() {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const cookieValue = cookiesStore.get('position-filter')?.value;
  const employeeIndicator = (await getEmployeeIndicator(company_id, cookieValue?.split(','))) || [
    {
      employees_operativos: 0,
      employees_used: 0,
      indicator: 0,
    },
  ];

  const diagramIndicator: any = await getDiagramIndicator(cookieValue?.split(',') || undefined);
  const positions = await fetchAllPositions();
  const positionsOptions = positions.map((position) => ({ label: position.name!, value: position.id }));
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
    {
      operative: employeeIndicator[0]?.employees_used ?? 0,
      available: (employeeIndicator[0]?.employees_operativos ?? 0) - (employeeIndicator[0]?.employees_used ?? 0),
    },
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
    <section>
      <div className="w-full pb-2">
        <PositionFilter positions={positionsOptions} />
      </div>
      <div className=" grid grid-cols-2 gap-4">
        <Empleados_diagramas chartData={newChartData} chartConfig={chartConfig} date={date} />

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
