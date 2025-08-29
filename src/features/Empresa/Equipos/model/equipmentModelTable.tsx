import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import React from 'react';
import { FetchModelOfVehiclesPagination } from '../actions/actions';

interface Brand {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  company_id: number | null;
}

interface EquipmentModel {
  id: string;
  name: string;
  brand: number | null;
  is_active: boolean;
  created_at: string;
}

const defaultVisibility: VisibilityState = {
  name: true,
  brand: true,
  is_active: true,
  actions: true,
} as const;

export function getEquipmentModelColumns(
  onEdit: (equipmentModel: EquipmentModel) => void,
  brands: Brand[]
): ColumnDef<EquipmentModel>[] {
  return [
    {
      accessorKey: 'name',
      id: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        // value will be an array of selected IDs
        return value.includes(row.original.id.toString());
      },
    },
    {
      accessorKey: 'brand',
      id: 'brand',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => {
        const brandId = row.original.brand;
        const brand = brands.find((b) => b.id === brandId);
        return <span>{brand?.name || 'Sin marca'}</span>;
      },
      // Server-side filtering will handle the actual filtering
      filterFn: () => true,
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const brandA = brands.find((b) => b.id === rowA.original.brand)?.name || '';
        const brandB = brands.find((b) => b.id === rowB.original.brand)?.name || '';
        return brandA.localeCompare(brandB);
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

interface EquipmentModelTableProps {
  brands: Brand[];
  onEdit?: (equipmentModel: EquipmentModel) => void;
  savedVisibility?: VisibilityState;
  savedFilter?: string[];
  models: EquipmentModel[];
}

function EquipmentModelTable({
  brands,
  onEdit = () => {},
  savedVisibility = defaultVisibility,
  savedFilter = [],
  models,
}: EquipmentModelTableProps) {
  // Estado para los filtros actuales
  const [columnFilters, setColumnFilters] = React.useState<Array<{ id: string; value: any }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('equipment-models-table');
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

  // Guardar filtros en localStorage cuando cambien
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
      localStorage.setItem('equipment-models-table', JSON.stringify(filtersObj));
    } catch (error) {
      console.error('Error al guardar filtros:', error);
    }
  }, [columnFilters]);

  // Manejador para cambios en los filtros
  const handleFilterChange = (filters: Array<{ id: string; value: any }>) => {
    setColumnFilters(filters);
  };

  // Columnas con filtros activos
  const initialVisibleFilters = React.useMemo(() => {
    return columnFilters.map((filter) => filter.id);
  }, [columnFilters]);

  // Obtener las columnas con la función onEdit
  const columns = React.useMemo(() => getEquipmentModelColumns(onEdit, brands), [onEdit, brands]);

  // Generar opciones de marcas para los filtros
  const brandOptions = React.useMemo(() => {
    return brands?.map((brand) => ({
      label: brand.name,
      value: brand.id, // Keep as number for filtering
    }));
  }, [brands]);

  const nameOptions = React.useMemo(() => {
    return models?.map((model) => ({
      label: model.name,
      value: model.id,
    }));
  }, [models]);
  // Configuración de las columnas filtrables
  const filterableColumns = [
    // {
    //   columnId: 'name',
    //   title: 'Nombre',
    //   options: nameOptions.map(option => ({
    //     ...option,
    //     value: option.value.toString() // Convert number to string
    //   })),
    // },
    {
      columnId: 'is_active',
      title: 'Estado',
      options: [
        { label: 'Activo', value: 'true' },
        { label: 'Inactivo', value: 'false' },
      ],
    },
    {
      columnId: 'brand',
      title: 'Marca',
      options: brandOptions.map((option) => ({
        ...option,
        value: option.value.toString(), // Convert number to string if needed
      })),
    },
  ];

  return (
    <BaseDataTable<EquipmentModel, unknown>
      columns={columns}
      tableId="equipment-models-table"
      savedVisibility={savedVisibility}
      serverSide={true}
      fetchData={FetchModelOfVehiclesPagination as any}
      onColumnFiltersChange={handleFilterChange as any}
      toolbarOptions={{
        initialVisibleFilters,
        showFilterOptions: true,
        filterableColumns,
      }}
      queryKey={'equipment-models-table'}
    />
  );
}

export default EquipmentModelTable;
