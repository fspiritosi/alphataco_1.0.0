import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import { fetchMaintenanceGroupsActionType, fetchTypesOfRepairActionType } from './actions/maintenanceGroupActions';

interface MaintenanceGroupsTableProps {
  groups: fetchMaintenanceGroupsActionType['groups'];
  types: fetchTypesOfRepairActionType['types'];
  selectedGroup: MaintenanceGroupsTableProps['groups'][number] | null;
  setSelectedGroup: (group: MaintenanceGroupsTableProps['groups'][number] | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
  mode: 'create' | 'edit';
  savedVisibility: VisibilityState;
  savedFilter: string[];
  canEdit: boolean;
}

function getTypeNames(typeIds: string[], types: MaintenanceGroupsTableProps['types']) {
  return typeIds.map((id) => types.find((t) => t.id === id)?.name).filter(Boolean) as string[];
}

export function getMaintenanceGroupsColumns(
  types: MaintenanceGroupsTableProps['types'],
  onEdit: (group: MaintenanceGroupsTableProps['groups'][number]) => void,
  canEdit: boolean
): ColumnDef<MaintenanceGroupsTableProps['groups'][number]>[] {
  const columns: ColumnDef<MaintenanceGroupsTableProps['groups'][number]>[] = [
    {
      accessorKey: 'name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'type_ids',
      id: 'Tipos de reparación',
      header: 'Tipos de reparación',
      cell: ({ row }) => {
        const typeNames = getTypeNames(
          row.original.maintenance_group_type_of_repairs?.map((r) => r.type_id) || [],
          types
        );
        if (!typeNames.length) return <span>-</span>;
        const [first, ...rest] = typeNames;
        if (rest.length === 0) {
          return <Badge variant="default">{first}</Badge>;
        }
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="cursor-pointer select-none">
                  {first} +{rest.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  {rest.map((name) => (
                    <p key={name}>{name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, id, value) => {
        const rowTypeIds = row.original.maintenance_group_type_of_repairs?.map((r) => r.type_id) || [];
        return value.some((val: string) => rowTypeIds.includes(val));
      },
    },
    {
      accessorKey: 'description',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => <span className="whitespace-pre-line text-gray-700">{row.original.description || '-'}</span>,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
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
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
  ];

  if (canEdit) {
    columns.push({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    });
  }

  return columns;
}

function MaintenanceGroupsTable({
  groups,
  types,
  setSelectedGroup,
  setMode,
  mode,
  savedVisibility,
  savedFilter,
  canEdit,
}: MaintenanceGroupsTableProps) {
  const [filteredData, setFilteredData] = useState<MaintenanceGroupsTableProps['groups']>(
    groups.filter((g) => g.is_active)
  );

  const handleEdit = (group: MaintenanceGroupsTableProps['groups'][number]) => {
    setSelectedGroup(group);
    setMode('edit');
  };

  const typeOptions = types.map((t) => ({ label: t.name, value: t.id }));
  const nameOptions = Array.from(new Set(groups.map((g) => g.name))).map((name) => ({ label: name, value: name }));
  const estadoOptions = [
    { label: 'Activo', value: 'true' },
    { label: 'Inactivo', value: 'false' },
  ];

  return (
    <div className="ml-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">Grupos de Reparación</h2>
      </div>
      <BaseDataTable
        className="mt-4"
        columns={getMaintenanceGroupsColumns(types, handleEdit, canEdit)}
        data={groups}
        savedVisibility={savedVisibility}
        tableId="maintenance-groups-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],
          filterableColumns: [
            {
              columnId: 'Nombre',
              title: 'Nombre',
              options: nameOptions,
            },
            {
              columnId: 'Tipos de reparación',
              title: 'Tipos de reparación',
              options: typeOptions,
            },
            {
              columnId: 'Estado',
              title: 'Estado',
              options: estadoOptions,
            },
          ],
        }}
      />
    </div>
  );
}

export default MaintenanceGroupsTable;
