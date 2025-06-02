import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import React from 'react';

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
  brand: number; // ID de la marca
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
const defaultVisibility: VisibilityState = {
  Nombre: true,
  Marca: true,
  Estado: true,
  Acciones: true,
} as const;
export function getEquipmentModelColumns(
  onEdit: (equipmentType: EquipmentModel) => void,
  brands: Brand[]
): ColumnDef<EquipmentModel>[] {
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
      accessorKey: 'brand',
      id: 'Marca',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => {
        const brandId = row.original.brand;
        const brand = brands.find((b) => b.id === brandId);
        return <span className="font-medium">{brand?.name || 'Sin marca'}</span>;
      },
      filterFn: (row, id, value) => {
        const brandId = row.original.brand;
        const brand = brands.find((b) => b.id === brandId);
        const brandName = brand?.name || 'Sin marca';
        return value.includes(brandName);
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
interface EquipmentModelTableProps {
  brands: any[];
  equipmentModels: EquipmentModel[];
  onEdit?: (equipmentModel: EquipmentModel) => void;
  savedVisibility?: VisibilityState;
  savedFilter?: string[];
}

function EquipmentModelTable({
  brands,
  equipmentModels,
  onEdit = () => {},
  savedVisibility = defaultVisibility,
  savedFilter = [],
}: EquipmentModelTableProps) {
  // Obtener las columnas con la función onEdit
  const columns = React.useMemo(() => getEquipmentModelColumns(onEdit, brands), [onEdit, brands]);

  // Opciones para el filtro de estado
  const statusOptions = [
    { label: 'Activo', value: 'true' },
    { label: 'Inactivo', value: 'false' },
  ];

  // Generar opciones de marcas para los filtros
  const brandOptions = React.useMemo(() => {
    const brandNames = equipmentModels
      ?.map((m) => {
        const brand = brands.find((b) => b.id === m.brand);
        return brand?.name || 'Sin marca';
      })
      .filter(Boolean);

    const uniqueBrands = Array.from(new Set(brandNames));

    return uniqueBrands.map((name) => ({
      label: name,
      value: name,
    }));
  }, [equipmentModels, brands]);

  // Generar opciones de nombres para los filtros
  const nameOptions = React.useMemo(() => {
    const uniqueNames = Array.from(new Set(equipmentModels?.map((m) => m.name).filter(Boolean)));
    return uniqueNames.map((name) => ({
      label: name,
      value: name,
    }));
  }, [equipmentModels]);

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
    {
      columnId: 'Marca',
      title: 'Marca',
      options: brandOptions,
    },
  ];

  return (
    <BaseDataTable
      columns={getEquipmentModelColumns(onEdit, brands)}
      data={equipmentModels}
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

export default EquipmentModelTable;

//
