import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/rrhh/verActivosButton';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';

export function getCostCenterColumns(onEdit: (costCenter: CostCenter) => void): ColumnDef<CostCenter>[] {
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

export function CostCenterTable({
  costCenters,
  onEdit,
  savedVisibility,
  savedFilter,
}: {
  costCenters: CostCenter[];
  onEdit: (costCenter: CostCenter) => void;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const [filteredData, setFilteredData] = useState<CostCenter[]>(costCenters);

  const names = createFilterOptions(
    filteredData,
    (document) => document.name
    // FileText // Icono para documentos
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Centros de Costo</h2>
        <VerActivosButton data={costCenters} filterKey="is_active" onFilteredChange={setFilteredData} />
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto w-full">
        <BaseDataTable
          savedVisibility={savedVisibility}
          columns={getCostCenterColumns(onEdit)}
          data={filteredData}
          tableId="cost-center-table"
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

export default CostCenterTable;
