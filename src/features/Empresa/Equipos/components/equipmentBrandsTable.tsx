import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import React from 'react';

type EquipmentBrand = {
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
export function getEquipmentBrandColumns(
  onEdit: (equipmentBrand: EquipmentBrand) => void
): ColumnDef<EquipmentBrand>[] {
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
interface EquipmentBrandsTableProps {
  equipmentBrands: EquipmentBrand[];
  onEdit?: (equipmentBrand: EquipmentBrand) => void;
  savedVisibility?: VisibilityState;
  savedFilter?: string[];
  names?: { label: string; value: string }[];
}

function EquipmentBrandsTable({
  equipmentBrands,
  onEdit = () => {},
  savedVisibility = defaultVisibility,
  savedFilter = [],
  names = [],
}: EquipmentBrandsTableProps) {
  // Obtener las columnas con la función onEdit
  const columns = React.useMemo(() => getEquipmentBrandColumns(onEdit), [onEdit]);

  // Opciones para el filtro de estado
  const statusOptions = [
    { label: 'Activo', value: 'true' },
    { label: 'Inactivo', value: 'false' },
  ];

  // Generar opciones de nombres para los filtros
  const nameOptions = React.useMemo(() => {
    return equipmentBrands?.map((type) => ({
      label: type.name,
      value: type.name,
    }));
  }, [equipmentBrands]);

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
      columns={getEquipmentBrandColumns(onEdit)}
      data={equipmentBrands}
      tableId="equipment-types-table"
      savedVisibility={savedVisibility}
      toolbarOptions={{
        initialVisibleFilters: savedFilter || [],
        showFilterOptions: true,
        filterableColumns,
      }}
    />
  );
}

export default EquipmentBrandsTable;

//
