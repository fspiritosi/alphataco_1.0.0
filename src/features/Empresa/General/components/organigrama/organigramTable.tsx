import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/verActivosButton';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';

interface Sector {
  id: string;
  name: string;
  is_active: boolean;
}

export function getOrganigramColumns(onEdit: (sector: Sector) => void, canEdit: boolean): ColumnDef<Sector>[] {
  const columns: ColumnDef<Sector>[] = [
    {
      accessorKey: 'name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
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

export function OrganigramTable({
  sectors,
  onEdit,
  savedVisibility,
  savedFilter,
}: {
  sectors: Sector[];
  onEdit: (sector: Sector) => void;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const [filteredData, setFilteredData] = useState<Sector[]>(sectors);
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('empresa', 'organigrama', 'update');

  const names = createFilterOptions(filteredData, (sector) => sector.name);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Sectores</h2>
        <VerActivosButton data={sectors} filterKey="is_active" onFilteredChange={setFilteredData} />
      </div>
      <div>
        <BaseDataTable
          savedVisibility={savedVisibility}
          columns={getOrganigramColumns(onEdit, canEdit)}
          data={filteredData}
          tableId="organigram-table"
          toolbarOptions={{
            initialVisibleFilters: savedFilter || [],
            filterableColumns: [
              {
                columnId: 'Nombre',
                title: 'Nombre',
                options: names,
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

export default OrganigramTable;
