import { VehicleNotInDailyReportType } from '@/app/server/GET/actions';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

export default function DialogComponent({
  isDialogOpen,
  setIsDialogOpen,
  condiciones_indicadores,
  vehiclesNotInDailyReport,
  vehiclesOnRepair,
  variant,
}: {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  condiciones_indicadores: any;
  vehiclesNotInDailyReport?: VehicleNotInDailyReportType[];
  vehiclesOnRepair?: VehicleNotInDailyReportType[];
  variant: 'success' | 'warning' | 'destructive';
}) {
  const columns = useMemo<ColumnDef<VehicleNotInDailyReportType>[]>(
    () => [
      {
        accessorKey: 'domain',
        header: 'Dominio',
        cell: ({ row }) => (
          <div className="font-medium hover:underline">
            <Link href={`/dashboard/equipment/action?action=view&id=${row.original.vehicle_id}`} target="_blank">
              {row.original.domain}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: 'type_name',
        header: 'Tipo',
        id: 'type_name',
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        cell: ({ row }) => <div className="text-gray-600">{row.getValue('type_name') || 'Sin tipo'}</div>,
      },
      {
        accessorKey: 'sub_type_name',
        header: 'SubTipo',
        id: 'sub_type_name',
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        cell: ({ row }) => <div className="text-gray-600">{row.getValue('sub_type_name') || 'Sin subtipo'}</div>,
      },
    ],
    []
  );
  const types = createFilterOptions(vehiclesOnRepair || vehiclesNotInDailyReport, (vehicle) => vehicle.type_name);
  const subTypes = createFilterOptions(
    vehiclesOnRepair || vehiclesNotInDailyReport,
    (vehicle) => vehicle.sub_type_name
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card
          className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200 hover:cursor-pointer"
          variant={variant}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">
                  {vehiclesNotInDailyReport?.length ? 'Disponibles' : 'Unidades en Reparación'}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {vehiclesNotInDailyReport?.length ? vehiclesNotInDailyReport?.length : vehiclesOnRepair?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-[70vw] max-h-full overflow-y-auto pb-8">
        <DialogHeader>
          <DialogTitle>
            {vehiclesNotInDailyReport?.length ? 'Disponibles' : 'Unidades en Reparación'} (
            {vehiclesNotInDailyReport?.length ? vehiclesNotInDailyReport?.length : vehiclesOnRepair?.length || 0})
          </DialogTitle>
          <DialogDescription>
            {' '}
            {vehiclesNotInDailyReport?.length
              ? 'Lista de unidades que se encuentran disponibles'
              : 'Lista de unidades que se encuentran en reparación'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 overflow-hidden">
          {(vehiclesOnRepair && vehiclesOnRepair?.length) ||
          (vehiclesNotInDailyReport && vehiclesNotInDailyReport?.length) ? (
            <BaseDataTable
              columns={columns}
              data={vehiclesOnRepair! || vehiclesNotInDailyReport!}
              toolbarOptions={{
                initialVisibleFilters: [],
                searchableColumns: [{ columnId: 'domain', placeholder: 'Buscar por dominio...' }],
                filterableColumns: [
                  {
                    columnId: 'type_name',
                    title: 'Tipo',
                    options: types,
                  },
                  {
                    columnId: 'sub_type_name',
                    title: 'SubTipo',
                    options: subTypes,
                  },
                ],
                showViewOptions: true,
              }}
              tableId="vehicles-disponibles-table"
              savedVisibility={{ type_name: true, sub_type_name: true }}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">No hay empleados disponibles</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
