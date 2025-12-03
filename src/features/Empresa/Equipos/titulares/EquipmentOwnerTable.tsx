import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import React from 'react';
import { FetchEquipmentOwnersType } from './actions/actions';

const defaultVisibility: VisibilityState = {
  Nombre: true,
  Estado: true,
  Tipo: true,
  Acciones: true,
} as const;
export function getEquipmentOwnerColumns(
  onEdit: (equipmentSubType: FetchEquipmentOwnersType[0]) => void,
  onViewEquipment: (equipmentSubType: FetchEquipmentOwnersType[0]) => void,
  equipmentOwners: FetchEquipmentOwnersType,
  canEdit: boolean
): ColumnDef<FetchEquipmentOwnersType[0]>[] {
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
      accessorKey: 'cuit',
      id: 'cuit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cuit" />,
      cell: ({ row }) => <span className="font-medium">{row.original.cuit}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'contract_types',
      id: 'Tipos',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos de Contrato" />,
      cell: ({ row }) => {
        const contractTypes = row.original.equipment_owner_contract_types?.map((ct) => ct.contract_type) || [];
        return (
          <div className="flex flex-wrap gap-1">
            {contractTypes.map((type, index) => (
              <Badge key={index} variant="outline">
                {type}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const contractTypes = row.original.equipment_owner_contract_types?.map((ct) => ct.contract_type) || [];
        return value.some((v: string) => contractTypes.includes(v as any));
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
        <div className="flex gap-2">
          {canEdit && (
            <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
              Editar
            </Button>
          )}
          <Button
            size="sm"
            variant="link"
            className="hover:text-green-600"
            onClick={() => onViewEquipment(row.original)}
          >
            Ver Equipos
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];
}
interface EquipmentOwnerTableProps {
  equipmentOwners: FetchEquipmentOwnersType;
  onEdit?: (equipmentType: FetchEquipmentOwnersType[0]) => void;
  onViewEquipment?: (equipmentType: FetchEquipmentOwnersType[0]) => void;
  canEdit?: boolean;
}

function EquipmentOwnerTable({
  equipmentOwners,
  onEdit = () => {},
  onViewEquipment = () => {},
  canEdit = false,
}: EquipmentOwnerTableProps) {
  // Leer las cookies necesarias
  const visibilityCookie = Cookies.get('equipment-owners-table');
  const filtersCookie = Cookies.get('equipment-owners-table-filters');
  // Inicializar la visibilidad y los filtros desde las cookies

  // Generar opciones de nombres para los filtros
  const nameOptions = React.useMemo(() => {
    return equipmentOwners.map((type) => ({
      label: type.name,
      value: type.name,
    }));
  }, [equipmentOwners]);
  const cuitOptions = React.useMemo(() => {
    return equipmentOwners.map((type) => ({
      label: type.cuit,
      value: type.cuit,
    }));
  }, [equipmentOwners]);
  const contractTypeOptions = React.useMemo(() => {
    return [
      { label: 'Leasing', value: 'Leasing' },
      { label: 'Alquiler', value: 'Alquiler' },
      { label: 'Prendado', value: 'Prendado' },
    ];
  }, []);

  // Configuración de las columnas filtrables
  const filterableColumns = [
    {
      columnId: 'Nombre',
      title: 'Nombre',
      options: nameOptions,
    },
    {
      columnId: 'cuit',
      title: 'CUIT',
      options: cuitOptions,
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
      columnId: 'Tipos',
      title: 'Tipos de Contrato',
      options: contractTypeOptions,
    },
  ];

  return (
    <BaseDataTable
      columns={getEquipmentOwnerColumns(onEdit, onViewEquipment, equipmentOwners, canEdit)}
      data={equipmentOwners}
      tableId="equipment-owners-table"
      savedVisibility={visibilityCookie ? JSON.parse(visibilityCookie) : {}}
      toolbarOptions={{
        initialVisibleFilters: filtersCookie ? JSON.parse(filtersCookie) : [],
        showFilterOptions: true,
        filterableColumns,
      }}
    />
  );
}

export default EquipmentOwnerTable;

//
