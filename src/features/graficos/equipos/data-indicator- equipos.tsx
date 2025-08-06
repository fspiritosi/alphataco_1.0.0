import { fetchTypeVehicles, getVehiclesDisponibleFilterType } from '@/app/server/GET/actions';
import moment from 'moment';
import { cookies } from 'next/headers';
import { EquiposChart } from './equiposChart';
import IndicatorCard from './indicatorCard';
import { TypeFilter } from './typeFilter';

export default async function EquipmentChart() {
  const cookiesStore = cookies();
  const cookieValue = cookiesStore.get('type-filter')?.value;

  const active_vehicles = await getVehiclesDisponibleFilterType(cookieValue?.split(',') || []);
  const tipo_vehiculos = await fetchTypeVehicles();
  console.log(active_vehicles);
  // Calcular el total de vehículos sumando todas las unidades
  // Calcular el total de vehículos (suma de todos los estados)
  const totalVehicles = active_vehicles?.reduce((sum, vehicle: any) => sum + vehicle.available_units || 0, 0) || 0;

  // Unidades disponibles
  const totalAvailable =
    active_vehicles?.reduce((sum, vehicle) => sum + (vehicle.available_units - vehicle.used_units || 0), 0) || 0;
  console.log(totalAvailable);
  // Unidades en uso
  const totalInUse = active_vehicles?.reduce((sum, vehicle) => sum + (vehicle.used_units || 0), 0) || 0;

  // Unidades no disponibles
  const totalNotAvailable =
    active_vehicles?.reduce((sum, vehicle: any) => sum + ((vehicle as any).not_available_units || 0), 0) || 0;

  // const inUsePercentage = active_vehicles?.usage_indicator || 0;
  // console.log(inUsePercentage)
  // Calcular el porcentaje de uso general
  const usagePercentage = totalVehicles > 0 ? Math.round((totalInUse / totalVehicles) * 100) : 0;
  console.log(usagePercentage);
  // Datos para el gráfico
  const indicatorCharData = [
    {
      operative: totalInUse,
      available: totalAvailable,
      // inUsePercentage: inUsePercentage
    },
  ];

  const indicatorChartConfig = {
    operative: {
      label: 'En Uso',
      color: '#34C759', // Mismo verde que en empleados
    },
    available: {
      label: 'Disponibles',
      color: '#e74c3c', // Mismo rojo que en empleados
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
      fill: active_vehicles.type_color || colorPalette[index % colorPalette.length],
    };
  });

  // Generar chartConfig dinámicamente a partir de chartData
  const chartConfig = {
    disponibles: { label: 'Disponibles' },
    enUso: { label: 'En Uso' },
    noDisponibles: { label: 'No Disponibles' },
    ...newChartData
      ?.filter((item: any) => item.disponibles > 0)
      .reduce(
        (acc: any, item: any) => {
          acc[item.novedad!] = { label: item.novedad!, color: item.fill };
          return acc;
        },
        {} as Record<string, { label: string; color: string }>
      ),
  };

  return (
    <div className="w-full h-full">
      <div className="w-full pb-2">
        <TypeFilter
          typesVehicle={tipo_vehiculos?.map((vehicle) => ({ label: vehicle.name, value: vehicle.id })) || []}
        />
      </div>
      <div className=" grid grid-cols-2 gap-4">
        <EquiposChart chartData={newChartData} chartConfig={chartConfig} date={date} />
        {/* </div>
      <div className="w-full pb-2">  */}
        <IndicatorCard
          totalVehicles={totalVehicles}
          disponibleEquipmentPorcent={usagePercentage}
          disponibleEquipmentNumber={totalAvailable || 0}
          activeEquipment={totalInUse || 0}
          // usageEquipment={totalInUse || 0}
          indicatorCharData={indicatorCharData}
          indicatorChartConfig={indicatorChartConfig}
          condiciones_indicadores={condiciones_indicadores}
        />
      </div>
    </div>
  );
}
