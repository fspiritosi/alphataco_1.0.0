import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import React from 'react';
import { Database } from '../../../../../database.types';
type VehicleType = Database['public']['Tables']['type']['Row'];
type VehicleSubType = Database['public']['Tables']['sub_type']['Row'];
const defaultVisibility: VisibilityState = {
  Nombre: true,
  Estado: true,
  Tipo: true,
  Acciones: true,
} as const;
export function getEquipmentSubTypeColumns(
  onEdit: (equipmentSubType: VehicleSubType) => void,
  vehicleTypes: VehicleType[],
  canEdit: boolean
): ColumnDef<VehicleSubType>[] {
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
      accessorKey: 'type',
      id: 'Tipo',
      // header: () => <span className="w-[200px]">Nombre</span>,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <span className="font-medium">
          {vehicleTypes.find((t) => t.id === row.original.type)?.name || row.original.type}
        </span>
      ),
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
interface EquipmentSubTypesTableProps {
  vehicleSubTypes: VehicleSubType[];
  vehicleTypes: VehicleType[];
  onEdit?: (equipmentType: VehicleSubType) => void;
  canEdit?: boolean;
  savedVisibility?: VisibilityState;
  savedFilter?: string[];
  names?: { label: string; value: string }[];
}

function EquipmentSubTypesTable({
  vehicleSubTypes,
  vehicleTypes,
  onEdit = () => {},
  canEdit = false,
  savedVisibility = defaultVisibility,
  savedFilter = [],
  names = [],
}: EquipmentSubTypesTableProps) {
  // Leer las cookies necesarias
  const visibilityCookie = Cookies.get('equipment-subtypes-table');
  const filtersCookie = Cookies.get('equipment-subtypes-table-filters');
  // Inicializar la visibilidad y los filtros desde las cookies
  // const savedVisibility = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersFromCookie = filtersCookie ? JSON.parse(filtersCookie) : savedFilter || [];
  // Obtener las columnas con la función onEdit
  const columns = React.useMemo(
    () => getEquipmentSubTypeColumns(onEdit, vehicleTypes, canEdit),
    [onEdit, vehicleTypes, canEdit]
  );

  // Opciones para el filtro de estado
  const statusOptions = [
    { label: 'Activo', value: 'true' },
    { label: 'Inactivo', value: 'false' },
  ];

  // Generar opciones de nombres para los filtros
  const nameOptions = React.useMemo(() => {
    return vehicleSubTypes.map((type) => ({
      label: type.name,
      value: type.name,
    }));
  }, [vehicleSubTypes]);
  const nameOptionsType = React.useMemo(() => {
    return vehicleTypes?.map((type) => ({
      label: type.name,
      value: type.id,
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
    {
      columnId: 'Tipo',
      title: 'Tipo',
      options: nameOptionsType,
    },
  ];

  return (
    <BaseDataTable
      columns={columns}
      data={vehicleSubTypes}
      tableId="equipment-subtypes-table"
      savedVisibility={savedVisibility}
      toolbarOptions={{
        initialVisibleFilters: savedFiltersFromCookie || [],
        showFilterOptions: true,
        filterableColumns,
      }}
    />
  );
}

export default EquipmentSubTypesTable;

//
