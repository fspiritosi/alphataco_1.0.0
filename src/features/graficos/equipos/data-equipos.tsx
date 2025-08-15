import { getVehiclesDisponibleFilterType } from '@/app/server/GET/actions';
import moment from 'moment';
import { cookies } from 'next/headers';
import { EquiposChart } from './equiposChart';
import { EquiposChart2 } from './equiposChart2';
import IndicatorCardChasisTractor from './indicatorCard2';
import IndicatorCardChasisTractor3 from './indicatorCard3';

export default async function DataEquipmentChart() {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const cookieValue = cookiesStore.get('type-filter')?.value;
  console.log(company_id);
  const active_vehicles = await getVehiclesDisponibleFilterType(
    ['ea07ff34-13fb-4483-b5bc-8389e41c7d89', '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf'],
    company_id
  );
  console.log(active_vehicles);
  // Calcular el total de vehículos sumando todas las unidades
  // Calcular el total de vehículos (suma de todos los estados)
  const totalVehicles =
    active_vehicles?.reduce(
      (sum, vehicle: any) => sum + vehicle.available_units + vehicle.not_available_units || 0,
      0
    ) || 0;

  // Unidades disponibles
  const totalAvailable =
    active_vehicles?.reduce((sum, vehicle) => sum + (vehicle.available_units - vehicle.used_units || 0), 0) || 0;
  // Unidades en uso
  const totalInUse = active_vehicles?.reduce((sum, vehicle) => sum + (vehicle.used_units || 0), 0) || 0;
  const totalActive = active_vehicles?.reduce((sum, vehicle) => sum + (vehicle.available_units || 0), 0) || 0;
  // Unidades no disponibles
  const totalNotAvailable =
    active_vehicles?.reduce((sum, vehicle: any) => sum + ((vehicle as any).not_available_units || 0), 0) || 0;

  // const inUsePercentage = active_vehicles?.usage_indicator || 0;
  // console.log(inUsePercentage)
  // Calcular el porcentaje de uso general
  const usagePercentage =
    totalVehicles > 0 ? Math.round(((totalVehicles - totalNotAvailable) / totalVehicles) * 100) : 0;
  console.log(usagePercentage);
  // Datos para el gráfico
  const indicatorCharData = [
    {
      operative: totalVehicles,
      not_available: totalNotAvailable,
      active: totalActive,
      inUsePercentage: usagePercentage,
    },
  ];

  const indicatorChartConfig = {
    operative: {
      label: 'Activos',
      color: '#34C759', // Mismo verde que en empleados
    },
    // available: {
    //   label: 'Disponibles',
    //   color: '#e74c3c', // Mismo rojo que en empleados
    // },
    not_available: {
      label: 'No Disponibles',
      color: '#e74c3c', // Mismo rojo que en empleados
    },
  } as const;
  const indicatorChartConfig2 = {
    operative: {
      label: 'Activos',
      color: '#e74c3c', // Mismo verde que en empleados '#e74c3c'
    },
    // available: {
    //   label: 'Disponibles',
    //   color: '#e74c3c', // Mismo rojo que en empleados
    // },
    not_available: {
      label: 'En Uso',
      color: '#34C759', // Mismo rojo que en empleados '#34C759'
    },
  } as const;
  const condiciones_indicadores = {
    success: 75,
    warning: 50,
    destructive: 25,
  };

  const date: string = moment().format('DD-MM-YYYY');
  // Define a color palette for the chart
  const colorPalette = [
    '#3498db', // blue
    '#2ecc71', // green
    '#e74c3c', // red
    '#f1c40f', // yellow
    '#9b59b6', // purple
    '#1abc9c', // turquoise
    '#e67e22', // orange
    '#34495e', // dark blue
    '#95a5a6', // gray
  ];

  const newChartData = active_vehicles?.map((active_vehicles: any, index: number) => {
    return {
      novedad: active_vehicles.type_name,
      disponibles: active_vehicles.available_units,
      enUso: active_vehicles.used_units,
      noDisponibles: active_vehicles.not_available_units,
      fill: colorPalette[index % colorPalette.length],
    };
  });

  // Generar chartConfig dinámicamente a partir de chartData
  const chartConfig = {
    // disponibles: { label: 'Disponibles' },
    enUso: { label: 'En Uso' },
    // noDisponibles: { label: 'No Disponibles' },
    total: { label: 'Total' },
    ...newChartData
      ?.filter((item: any) => item.disponibles > 0)
      .reduce(
        (acc: any, item: any) => {
          acc[item.novedad!] = { label: item.novedad, color: item.fill };
          return acc;
        },
        {} as Record<string, { label: string; color: string }>
      ),
  };
  console.log(newChartData);
  console.log(chartConfig);
  console.log(indicatorCharData);
  console.log(indicatorChartConfig);
  console.log(indicatorChartConfig2);
  return (
    // <div className="w-full h-full">
    <section>
      <div className="grid grid-cols-2 gap-4">
        <EquiposChart chartData={newChartData} chartConfig={chartConfig} date={date} />
        <div className="h-full ">
          <IndicatorCardChasisTractor
            totalVehicles={totalVehicles}
            disponibleEquipmentPorcent={usagePercentage}
            disponibleEquipmentNumber={totalAvailable || 0}
            notAvailableEquipmentNumber={totalNotAvailable || 0}
            activeEquipment={totalActive || 0}
            // usageEquipment={totalInUse || 0}
            indicatorCharData={indicatorCharData}
            indicatorChartConfig={indicatorChartConfig}
            condiciones_indicadores={condiciones_indicadores}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-3">
        <EquiposChart2 chartData={newChartData} chartConfig={chartConfig} date={date} />
        <div className="h-full ">
          <IndicatorCardChasisTractor3
            totalVehicles={totalVehicles}
            disponibleEquipmentPorcent={usagePercentage}
            disponibleEquipmentNumber={totalAvailable || 0}
            notAvailableEquipmentNumber={totalNotAvailable || 0}
            activeEquipment={totalActive || 0}
            usageEquipment={totalInUse || 0}
            indicatorCharData={indicatorCharData}
            indicatorChartConfig={indicatorChartConfig2}
            condiciones_indicadores={condiciones_indicadores}
          />
        </div>
      </div>
    </section>
  );
}
