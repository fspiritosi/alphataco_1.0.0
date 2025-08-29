'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/rrhh/verActivosButton';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import { AptitudTecnica } from '../actions/aptitudesTecnicas';

interface AptitudesTableProps {
  aptitudes: AptitudTecnica[];
  onEdit: (aptitud: AptitudTecnica) => void;
  savedVisibility?: VisibilityState;
  savedFilter?: string[];
}

export function getAptitudesColumns(onEdit: (aptitud: AptitudTecnica) => void): ColumnDef<AptitudTecnica>[] {
  return [
    {
      accessorKey: 'nombre',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'aptitudes_tecnicas_puestos',
      id: 'Puestos',
      header: 'Puestos',
      cell: ({ row }) => {
        const puestos = row.original.aptitudes_tecnicas_puestos || [];
        if (!puestos || puestos.length === 0) {
          return <span className="text-muted-foreground">Sin puestos asignados</span>;
        }

        const [first, ...rest] = puestos;
        if (rest.length === 0) {
          return <Badge variant="default">{first?.puesto_id?.name}</Badge>;
        }

        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="cursor-pointer select-none">
                  {first?.puesto_id?.name} +{rest.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  {rest.map((puesto, index) => (
                    <p key={`${puesto.puesto_id?.id || 'puesto'}-${index}`}>{puesto.puesto_id?.name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.original.aptitudes_tecnicas_puestos?.map((p) => p.puesto_id?.name).filter(Boolean) || [];
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        return value.some((val) => rowValues.includes(val));
      },
    },
    {
      accessorKey: 'is_active',
      id: 'Estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    },
  ];
}

export function AptitudesTable({ aptitudes, onEdit, savedVisibility = {}, savedFilter = [] }: AptitudesTableProps) {
  const [filteredData, setFilteredData] = useState<AptitudTecnica[]>(aptitudes.filter((a) => a.is_active));

  // Crear opciones de filtro para las columnas filtrables
  const nombresOptions = createFilterOptions(aptitudes, (aptitud) => aptitud.nombre);

  // Obtener todos los puestos únicos para el filtro
  const allPuestos = aptitudes
    .flatMap((aptitud) => aptitud.aptitudes_tecnicas_puestos?.map((p) => p.puesto_id?.name).filter(Boolean))
    .filter(Boolean);

  const puestosOptions = createFilterOptions(allPuestos, (puesto) => puesto);

  return (
    <div className="ml-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">Aptitudes</h2>
        <div className="flex justify-end">
          <VerActivosButton data={aptitudes} filterKey="is_active" onFilteredChange={setFilteredData} />
        </div>
      </div>

      <BaseDataTable
        className="mt-4"
        columns={getAptitudesColumns(onEdit)}
        data={aptitudes}
        savedVisibility={savedVisibility}
        tableId="aptitudes-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],
          filterableColumns: [
            {
              columnId: 'Nombre',
              title: 'Nombre',
              options: nombresOptions,
            },
            {
              columnId: 'Puestos',
              title: 'Puestos',
              options: puestosOptions,
            },
          ],
        }}
      />
    </div>
  );
}
