'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users } from 'lucide-react';
import { useState } from 'react';
import { IndicatorChart } from '../../../graficos/indicatorChart';
import DialogComponent from '../../../graficos/rrhh/dialogComponent';

export default function EmployeeIndicatorCard({
  disponibleEmployeesPorcent,
  disponibleEmployeesNumber,
  diagramActiveEmployees,
  indicatorCharData,
  indicatorChartConfig,
  condiciones_indicadores,
  usageEmployees,
  employeesNotInDailyReport,
}: {
  disponibleEmployeesPorcent: number;
  disponibleEmployeesNumber: number;
  diagramActiveEmployees: number | undefined;
  indicatorCharData: any;
  indicatorChartConfig: any;
  condiciones_indicadores: any;
  usageEmployees: any;
  employeesNotInDailyReport: any[];
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Card
      className="h-full w-full flex flex-col items-center  px-0"
      variant={
        Math.round(disponibleEmployeesPorcent) !== 0
          ? Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.success
            ? 'success'
            : Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.warning
              ? 'warning'
              : 'destructive'
          : 'destructive'
      }
    >
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold">Indicador de eficacia Empleados</CardTitle>
      </CardHeader>
      <div className="flex items-center justify-between w-full px-4">
        <div className="flex flex-col gap-2 mb-2 w-1/2 justify-center">
          <Card
            className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200"
            variant={
              Math.round(disponibleEmployeesPorcent) !== 0
                ? Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.success
                  ? 'success'
                  : Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.warning
                    ? 'warning'
                    : 'destructive'
                : 'destructive'
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Activos</p>
                  <p className="text-xl font-bold text-gray-900">{diagramActiveEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200"
            variant={
              Math.round(disponibleEmployeesPorcent) !== 0
                ? Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.success
                  ? 'success'
                  : Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.warning
                    ? 'warning'
                    : 'destructive'
                : 'destructive'
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">En operación</p>
                  <p className="text-xl font-bold text-gray-900">{usageEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <DialogComponent
            disponibleEmployeesNumber={disponibleEmployeesNumber}
            employeesNotInDailyReport={employeesNotInDailyReport}
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            disponibleEmployeesPorcent={disponibleEmployeesPorcent}
            condiciones_indicadores={condiciones_indicadores}
          />
          {/* <Card
            className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200"
            variant={
              Math.round(disponibleEmployeesPorcent) !== 0
                ? Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.success
                  ? 'success'
                  : Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.warning
                    ? 'warning'
                    : 'destructive'
                : 'destructive'
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Disponibles</p>
                  <p className="text-xl font-bold text-gray-900">{disponibleEmployeesNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
        <IndicatorChart
          chartConfig={indicatorChartConfig}
          chartData={indicatorCharData}
          totalIndicator={Math.round(disponibleEmployeesPorcent) !== 0 ? Math.round(disponibleEmployeesPorcent) : 0}
        />
      </div>
      <CardFooter>
        <CardDescription className="text-xs">
          <span className="font-bold">Indicador = </span>Empleados activos - Empleados en operación
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
