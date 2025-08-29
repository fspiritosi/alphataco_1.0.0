import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/rrhh/verActivosButton';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';

import { Position } from '@/types/types';
interface PositionsTableProps {
  positions: (Position & { aptitudes?: any[] })[];
  hierarchicalPositions: any[];
  selectedPosition: Position | null;
  setSelectedPosition: (position: Position | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
  mode: 'create' | 'edit';
  savedVisibility: VisibilityState;
  savedFilter: string[];
}

export function getPositionsColumns(
  onEdit: (position: PositionsTableProps['positions'][number]) => void
): ColumnDef<PositionsTableProps['positions'][number]>[] {
  return [
    {
      accessorKey: 'name',
      id: 'Nombre',
      // header: () => <span className="w-[200px]">Nombre</span>,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    // {
    //   accessorKey: 'hierarchical_position_id',
    //   id: 'Posición jerarquica',
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Posición jerarquica" />,
    //   filterFn: (row, id, value) => {
    //     return value.includes(row.getValue(id));
    //   },
    // },
    {
      accessorKey: 'hierarchical_position_id',
      id: 'Posición jerarquica',
      header: 'Posición jerarquica',
      cell: ({ row }) => {
        const provinces: string[] = row.original.hierarchical_position_id || [];
        if (!provinces || provinces.length === 0) return null;
        const [first, ...rest] = provinces;
        if (rest.length === 0) {
          return <Badge variant="default">{first}</Badge>;
        }
        return (
          <>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default" className="cursor-pointer select-none">
                    {first} +{rest.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-1">
                    {rest.map((prov) => (
                      <p key={prov}>{prov}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || [];
        // Aseguramos que ambos sean arrays
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        // ¿Algún elemento de value está en rowValues?
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

function PositionsTable({
  positions,
  hierarchicalPositions,
  setSelectedPosition,
  setMode,
  mode,
  savedVisibility,
  savedFilter,
}: PositionsTableProps) {
  const [filteredData, setFilteredData] = useState<PositionsTableProps['positions']>(
    positions.filter((p) => p.is_active)
  );
  const handleEdit = (position: PositionsTableProps['positions'][number]) => {
    setSelectedPosition({
      ...position,
      hierarchical_position_id: position?.hierarchical_position_id?.map(
        (h) => hierarchicalPositions.find((hp) => hp.name === h)?.id
      ),
    });
    setMode('edit');
  };

  const formattedData = positions.map((position) => ({
    ...position,
    hierarchical_position_id: position?.hierarchical_position_id?.map(
      (h) => hierarchicalPositions.find((hp) => hp.id === h)?.name
    ),
  }));

  const allPositions = positions
    .flatMap((position) =>
      position?.hierarchical_position_id?.map((h) => hierarchicalPositions.find((hp) => hp.id === h)?.name)
    )
    .filter(Boolean);

  const name = createFilterOptions(positions, (position) => position.name);
  const positionsOptions = createFilterOptions(allPositions, (name) => name);

  return (
    <div className="ml-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">Posiciones</h2>
        <div className="flex justify-end">
          <VerActivosButton data={positions} filterKey="is_active" onFilteredChange={setFilteredData} />
        </div>
      </div>
      {/* <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Puestos</TableHead>
            <TableHead>Aptitudes</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData?.length > 0 ? (
            filteredData.map((position) => (
              <TableRow key={position.id}>
                <TableCell>{position.name}</TableCell>
                <TableCell>
                  <Badge variant={position.is_active ? 'success' : 'destructive'}>
                    {position.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate max-w-[200px] cursor-pointer">
                          <Badge>
                            {hierarchicalPositions.find((h) => h.id === position?.hierarchical_position_id?.[0])
                              ?.name || '-'}
                            {(position?.hierarchical_position_id?.length||0) > 1 &&
                              ` +${((position?.hierarchical_position_id?.length||0)) - 1}`}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex flex-col ">
                          {hierarchicalPositions
                            .filter((h) => position?.hierarchical_position_id?.includes(h.id))
                            .map((hierarchicalPosition) => (
                              <span key={hierarchicalPosition.id}>{hierarchicalPosition.name}</span>
                            ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate max-w-[200px] cursor-pointer">
                          <Badge>
                            {position.aptitudes?.[0]?.nombre || 'No hay aptitudes asignadas'}
                            {position.aptitudes?.length &&
                              position.aptitudes.length > 1 &&
                              ` +${position.aptitudes.length - 1}`}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex flex-col gap-1">
                          {position.aptitudes?.map((aptitude: any, index: number) => (
                            <span key={`${aptitude.id}-${index}`}>{aptitude.nombre}</span>
                          )) || <span>No hay aptitudes asignadas</span>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="link"
                    className="hover:text-blue-400"
                    onClick={() => {
                      setMode('edit'), setSelectedPosition(position);
                    }}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                No hay tipos de Posiciones {mode === 'create' ? 'activos' : 'inactivos'} disponibles
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table> */}

      <BaseDataTable
        className="mt-4"
        columns={getPositionsColumns(handleEdit)}
        data={formattedData as any}
        savedVisibility={savedVisibility}
        tableId="positions-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],
          filterableColumns: [
            {
              columnId: 'Nombre',
              title: 'Nombre',
              options: name,
            },
            {
              columnId: 'Posición jerarquica',
              title: 'Posición jerarquica',
              options: positionsOptions,
            },
          ],
        }}
      />
    </div>
  );
}

export default PositionsTable;
