import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IndicatorChart } from '../indicatorChart';

export default function IndicatorCardEquipment({
  totalVehicles,
  disponibleEquipmentPorcent,
  disponibleEquipmentNumber,
  activeEquipment,
  indicatorCharData,
  indicatorChartConfig,
  condiciones_indicadores,
  // usageEquipment,
}: {
  totalVehicles: number;
  disponibleEquipmentPorcent: number;
  disponibleEquipmentNumber: number;
  activeEquipment: number | undefined;
  indicatorCharData: any;
  indicatorChartConfig: any;
  condiciones_indicadores: any;
  // usageEquipment: any;
}) {
  return (
    <Card
      className="h-full w-full flex flex-col items-center justify-between px-0"
      variant={
        Math.round(disponibleEquipmentPorcent) !== 0
          ? Math.round(disponibleEquipmentPorcent) >= condiciones_indicadores.success
            ? 'success'
            : Math.round(disponibleEquipmentPorcent) >= condiciones_indicadores.warning
              ? 'warning'
              : 'destructive'
          : 'destructive'
      }
    >
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold">Indicador de eficacia Empleados</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-3 gap-2 items-center">
        <CardContent className="col-span-2 flex items-center justify-center max-h-[200px]">
          <IndicatorChart
            chartConfig={indicatorChartConfig}
            chartData={indicatorCharData}
            totalIndicator={Math.round(disponibleEquipmentPorcent) !== 0 ? Math.round(disponibleEquipmentPorcent) : 0}
          />
        </CardContent>
        <CardContent className="flex flex-col gap-2 items-start justify-center">
          <CardDescription className="text-sm ">
            Activos: <span className="ml-2 font-bold">{totalVehicles}</span>
          </CardDescription>
          <CardDescription className="text-sm ">
            En operación:<span className="ml-2 !important text-green-600  font-bold">{activeEquipment}</span>
          </CardDescription>
          <CardDescription className="text-sm ">
            Disponibles:<span className="ml-2 !important text-red-600 font-bold"> {disponibleEquipmentNumber}</span>
          </CardDescription>
        </CardContent>
      </div>
      <CardFooter>
        <CardDescription className="text-xs">
          <span className="font-bold">Indicador = </span>Empleados activos - Empleados en operación
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
