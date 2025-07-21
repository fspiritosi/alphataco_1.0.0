import { fetchDiagramsTypes, getActiveEmployees, getDiagramsDay } from '@/app/server/GET/actions';
import moment from 'moment';
import { cookies } from 'next/headers';
import { Empleados_diagramas } from './empleados-diagramas';

export default async function EmpleadoDiagramasChart() {
  const cookiesStore = cookies();

  const diagrams_types = await fetchDiagramsTypes();
  //console.log(diagrams_types, 'diagrams_types');
  const novedades = diagrams_types.map((diagram_type) => ({
    id: diagram_type.id,
    name: diagram_type.name,
    color: diagram_type.color,
  }));
  const diagrams_day = await getDiagramsDay();
  const active_employees = await getActiveEmployees();
  const date: string = moment().format('YYYY-MM-DD');

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

  //console.log(chartData, 'chartData');

  return <Empleados_diagramas chartData={chartData} chartConfig={chartConfig} date={date} />;
}
