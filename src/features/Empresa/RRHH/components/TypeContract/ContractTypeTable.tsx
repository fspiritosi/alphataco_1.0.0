'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { VerActivosButton } from '../verActivosButton';
interface ContractTypeTableProps {
  contractTypes: ContractType[];
  onEdit: (contractType: ContractType) => void;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}

export function getContractTypeColumns(
  onEdit: (contractType: ContractType) => void,
  canEdit: boolean
): ColumnDef<ContractType>[] {
  return [
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
      accessorKey: 'description',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'is_active',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) =>
        canEdit ? (
          <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
            Editar
          </Button>
        ) : null,
      enableSorting: false,
    },
  ];
}

export default function ContractTypeTable({
  contractTypes,
  onEdit,
  savedVisibility,
  savedFilter,
}: ContractTypeTableProps) {
  const [isActiveFilter, setIsActiveFilter] = useState(true);
  const [filteredContractTypes, setFilteredContractTypes] = useState<ContractType[]>([]);

  useEffect(() => {
    filterContractTypes();
  }, [isActiveFilter, contractTypes]);

  const filterContractTypes = () => {
    const filtered = contractTypes.filter((contractType) => contractType.is_active === isActiveFilter);
    setFilteredContractTypes(filtered);
  };

  const names = createFilterOptions(filteredContractTypes, (document) => document.name);

  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('empresa', 'contract-types', 'update');

  return (
    <div className="flex flex-col ml-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">Tipos de Contrato</h2>
        <VerActivosButton data={contractTypes} filterKey="is_active" onFilteredChange={setFilteredContractTypes} />
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto w-full">
        <BaseDataTable
          className="mt-4"
          columns={getContractTypeColumns(onEdit, canUpdate)}
          data={filteredContractTypes}
          savedVisibility={savedVisibility}
          tableId="contract-type-table"
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
