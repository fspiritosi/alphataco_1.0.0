import { VehicleNotInDailyReportType } from '@/app/server/GET/actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createNestedFilterOptions } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Building, Clock } from 'lucide-react';
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
  vehiclesNotInDailyReport?: VehicleNotInDailyReportType;
  vehiclesOnRepair?: VehicleNotInDailyReportType;
  variant: 'success' | 'warning' | 'destructive';
}) {
  console.log('vehiclesNotInDailyReport', vehiclesNotInDailyReport);
  console.log('vehiclesOnRepair', vehiclesOnRepair);
  const columns = useMemo<ColumnDef<VehicleNotInDailyReportType[number]>[]>(
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
      {
        accessorKey: 'customers',
        header: 'Clientes',
        id: 'customers',
        filterFn: (row, id, filterValue) => {
          // Si no hay filtro o el array está vacío, mostramos todas las filas
          if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
            return true;
          }

          const contractors: any = row.original.customers || [];

          // Si no hay contratistas, no mostramos la fila
          if (contractors.length === 0) {
            return false;
          }

          // Comprobamos si algún contratista coincide con el filtro
          return contractors.some((contractor: any) => {
            const name = contractor?.customer_name;
            return name && filterValue.flat().includes(name);
          });
        },
        exportFormatter: (value: any, row: any) => {
          const contractors = row.original.customers
            ?.map((contractor: any) => contractor.customer_name || '')
            .filter(Boolean);
          return contractors && contractors.length > 0 ? contractors.join(', ') : 'Sin afectar';
        },
        cell: ({ row }) => {
          const contractors: any = row.original.customers || [];
          console.log('contractors', contractors);
          // Si no hay contratistas, mostramos "Sin afectar"
          if (contractors.length === 0) {
            return <Badge>Sin afectar</Badge>;
          }

          // Define the contractor type
          // Get contractor names
          const contractorNames = (contractors as any)
            .map((contractor: any) => {
              if (typeof contractor === 'string') return contractor;
              return contractor?.customer_name || '';
            })
            .filter((name: any): name is string => Boolean(name));

          const firstContractor = contractorNames[0] || '—';

          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex">
                    <Badge>
                      {firstContractor}
                      {contractorNames.length > 1 && ` +${contractorNames.length - 1}`}
                    </Badge>
                  </div>
                </TooltipTrigger>
                {contractorNames.length > 1 && (
                  <TooltipContent className="text-white bg-black rounded-lg p-2">
                    <div className="flex flex-col gap-1">
                      {contractorNames.map((name: any, index: any) => (
                        <span key={index}>{name}</span>
                      ))}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
    ],
    []
  );
  const types = createFilterOptions(vehiclesOnRepair || vehiclesNotInDailyReport, (vehicle) => vehicle.type_name);
  const subTypes = createFilterOptions(
    vehiclesOnRepair || vehiclesNotInDailyReport,
    (vehicle) => vehicle.sub_type_name
  );
  const customers = createNestedFilterOptions(
    vehiclesOnRepair || vehiclesNotInDailyReport,
    (customer: any) => customer?.customers?.map((contractor: any) => contractor?.customer_name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
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
                  {
                    columnId: 'customers',
                    title: 'Clientes',
                    options: customers,
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
