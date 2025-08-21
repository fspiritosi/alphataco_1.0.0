import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import React from 'react';
import { FetchBrandOfVehiclesPagination } from '../actions/actions';

type EquipmentBrand = {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const defaultVisibility: VisibilityState = {
  name: true,
  is_active: true,
  actions: true,
} as const;

export function getEquipmentBrandColumns(
  onEdit: (equipmentBrand: EquipmentBrand) => void
): ColumnDef<EquipmentBrand>[] {
  return [
    {
      accessorKey: 'name',
      id: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'is_active',
      id: 'is_active',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        const rowValue = String(row.original.is_active);
        return value.includes(rowValue);
      },
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

interface EquipmentBrandsTableProps {
  equipmentBrands: EquipmentBrand[];
  onEdit?: (equipmentBrand: EquipmentBrand) => void;
  savedVisibility?: VisibilityState;
}

function EquipmentBrandsTable({
  equipmentBrands,
  onEdit = () => {},
  savedVisibility = defaultVisibility,
}: EquipmentBrandsTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<Array<{ id: string; value: any }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('equipment-brands-table-brand');
      if (!saved) return [];
      const filters = JSON.parse(saved);
      return Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([id, value]) => ({ id, value }));
    } catch (error) {
      console.error('Error al cargar filtros guardados:', error);
      return [];
    }
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const filtersObj = columnFilters.reduce(
        (acc, { id, value }) => ({
          ...acc,
          [id]: value,
        }),
        {}
      );
      localStorage.setItem('equipment-brands-table-brand', JSON.stringify(filtersObj));
    } catch (error) {
      console.error('Error al guardar filtros:', error);
    }
  }, [columnFilters]);

  const handleFilterChange = (filters: Array<{ id: string; value: any }>) => {
    setColumnFilters(filters);
  };

  const initialVisibleFilters = React.useMemo(() => {
    return columnFilters.map((filter) => filter.id);
  }, [columnFilters]);

  const columns = React.useMemo(() => getEquipmentBrandColumns(onEdit), [onEdit]);

  const nameOptions = React.useMemo(() => {
    return equipmentBrands?.map((type) => ({
      label: type.name,
      value: type.name,
    }));
  }, [equipmentBrands]);

  const filterableColumns = [
    {
      columnId: 'name',
      title: 'Nombre',
      options: nameOptions,
    },
    {
      columnId: 'is_active',
      title: 'Estado',
      options: [
        { label: 'Activo', value: 'true' },
        { label: 'Inactivo', value: 'false' },
      ],
    },
  ];

  return (
    <BaseDataTable
      columns={columns}
      tableId="equipment-brands-table-brand"
      savedVisibility={savedVisibility}
      serverSide={true}
      fetchData={FetchBrandOfVehiclesPagination as any}
      onColumnFiltersChange={handleFilterChange as any}
      toolbarOptions={{
        initialVisibleFilters,
        showFilterOptions: true,
        filterableColumns,
      }}
      queryKey={'equipment-brands-table-brand'}
    />
  );
}

export default EquipmentBrandsTable;
