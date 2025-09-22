import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FetchTypeOfVehicles, FetchTypeOfVehiclesPagination } from '@/features/Empresa/Equipos/actions/actions';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import React from 'react';
type EquipmentType = {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};
const defaultVisibility: VisibilityState = {
  Nombre: true,
  Estado: true,
  Acciones: true,
} as const;
export function getEquipmentTypeColumns(onEdit: (equipmentType: EquipmentType) => void): ColumnDef<EquipmentType>[] {
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
      filterFn: (row, id, value) => {
        // Convertir el valor booleano a string para comparar con los valores del filtro
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
interface EquipmentTypesTableProps {
  vehicleTypes: Awaited<ReturnType<typeof FetchTypeOfVehicles>>;
  onEdit?: (equipmentType: EquipmentType) => void;
  savedVisibility?: VisibilityState;
  savedFilter?: string[];
  names?: { label: string; value: string }[];
}

function EquipmentTypesTable({
  vehicleTypes,
  onEdit = () => {},
  savedVisibility = defaultVisibility,
  savedFilter: initialSavedFilter = [],
  names = [],
}: EquipmentTypesTableProps) {
  // Estado para los filtros actuales
  const [columnFilters, setColumnFilters] = React.useState<Array<{ id: string; value: any }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('equipment-types-table-type-filters');
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
      localStorage.setItem('equipment-types-table-type-filters', JSON.stringify(filtersObj));
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
  const columns = React.useMemo(() => getEquipmentTypeColumns(onEdit), [onEdit]);

  // Generar opciones de nombres para los filtros
  const nameOptions = React.useMemo(() => {
    return vehicleTypes?.map((type) => ({
      label: type.name,
      value: type.name,
    }));
  }, [vehicleTypes]);

  // Configuración de las columnas filtrables
  const filterableColumns = [
    {
      columnId: 'Nombre',
      title: 'Nombre',
      options: nameOptions,
    },
    {
      columnId: 'Estado',
      title: 'Estado',
      options: [
        { label: 'Activo', value: 'true' },
        { label: 'Inactivo', value: 'false' },
      ],
    },
  ];

  return (
    <BaseDataTable
      columns={getEquipmentTypeColumns(onEdit)}
      // data={vehicleTypes}
      tableId="equipment-types-table-type"
      serverSide={true}
      fetchData={FetchTypeOfVehiclesPagination as any}
      savedVisibility={savedVisibility}
      onColumnFiltersChange={handleFilterChange as any}
      toolbarOptions={{
        initialVisibleFilters,
        showFilterOptions: true,
        filterableColumns,
      }}
      queryKey={'equipment-types-table-type'}
    />
  );
}

export default EquipmentTypesTable;
