'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users } from 'lucide-react';
import { useState } from 'react';
import { IndicatorChart } from '../indicatorChart';
import DialogComponent from './dialogComponent';

export default function IndicatorCardEquipment({
  totalVehicles,
  disponibleEquipmentPorcent,
  disponibleEquipmentNumber,
  activeEquipment,
  indicatorCharData,
  indicatorChartConfig,
  condiciones_indicadores,
  vehiclesNotInDailyReport,
  // usageEquipment,
}: {
  totalVehicles: number;
  disponibleEquipmentPorcent: number;
  disponibleEquipmentNumber: number;
  activeEquipment: number | undefined;
  indicatorCharData: any;
  indicatorChartConfig: any;
  condiciones_indicadores: any;
  vehiclesNotInDailyReport: any;

  // usageEquipment: any;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getVariant = () => {
    if (Math.round(disponibleEquipmentPorcent) !== 0) {
      return Math.round(disponibleEquipmentPorcent) >= condiciones_indicadores.success
        ? 'success'
        : Math.round(disponibleEquipmentPorcent) >= condiciones_indicadores.warning
          ? 'warning'
          : 'destructive';
    }
    return 'destructive';
  };

  return (
    <Card className="h-full w-full flex flex-col items-center  px-0" variant={getVariant()}>
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold">Indicador de eficacia Equipos</CardTitle>
      </CardHeader>
      <div className="flex items-center justify-between w-full px-4">
        <div className="flex flex-col gap-2 mb-2 w-1/2 justify-center">
          <Card
            className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200"
            variant={getVariant()}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Activos</p>
                  <p className="text-xl font-bold text-gray-900">{totalVehicles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200"
            variant={getVariant()}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">En operación</p>
                  <p className="text-xl font-bold text-gray-900">{activeEquipment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <DialogComponent
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            condiciones_indicadores={condiciones_indicadores}
            vehiclesNotInDailyReport={vehiclesNotInDailyReport}
            variant={getVariant()}
          />
        </div>
        <IndicatorChart
          chartConfig={indicatorChartConfig}
          chartData={indicatorCharData}
          totalIndicator={Math.round(disponibleEquipmentPorcent) !== 0 ? Math.round(disponibleEquipmentPorcent) : 0}
        />
      </div>
      <CardFooter>
        <CardDescription className="text-xs">
          <span className="font-bold">Indicador = </span>Equipos activos - Equipos en operación
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
