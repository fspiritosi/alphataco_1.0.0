import { Badge } from '@/components/ui/badge';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { EditModal } from './EditDocumenTypeModal';

interface DocumentsTableProps {
  data: any[];
  filters: {
    name: string;
    multiresource: string;
    special: string;
    monthly: string;
    expired: string;
    mandatory: string;
    private: string;
  };
  children: React.ReactNode;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}

export function getDocumentColumns(): ColumnDef<any>[] {
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
      accessorKey: 'multiresource',
      id: 'Multirecurso',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Multirecurso" />,
      cell: ({ row }) => (
        <Badge variant={row.original.multiresource ? 'success' : 'default'}>
          {row.original.multiresource ? 'Si' : 'No'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.getValue(id) ? 'Si' : 'No';
        return value.includes(val);
      },
    },
    {
      accessorKey: 'special',
      id: 'Especial',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Especial" />,
      cell: ({ row }) => (
        <Badge variant={row.original.special ? 'success' : 'default'}>{row.original.special ? 'Si' : 'No'}</Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.getValue(id) ? 'Si' : 'No';
        return value.includes(val);
      },
    },
    {
      accessorKey: 'monthly',
      id: 'Mensual',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mensual" />,
      cell: ({ row }) => (
        <Badge variant={row.original.monthly ? 'success' : 'default'}>{row.original.monthly ? 'Si' : 'No'}</Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.getValue(id) ? 'Si' : 'No';
        return value.includes(val);
      },
    },
    {
      accessorKey: 'expired',
      id: 'Vence',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vence" />,
      cell: ({ row }) => (
        <Badge variant={row.original.explired ? 'success' : 'default'}>{row.original.explired ? 'Si' : 'No'}</Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.getValue(id) ? 'Si' : 'No';
        return value.includes(val);
      },
    },
    {
      accessorKey: 'mandatory',
      id: 'Mandatorio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mandatorio" />,
      cell: ({ row }) => (
        <Badge variant={row.original.mandatory ? 'success' : 'default'}>{row.original.mandatory ? 'Si' : 'No'}</Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.getValue(id) ? 'Si' : 'No';
        return value.includes(val);
      },
    },
    {
      accessorKey: 'private',
      id: 'Privado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Privado" />,
      cell: ({ row }) => (
        <Badge variant={row.original.private ? 'success' : 'default'}>{row.original.private ? 'Si' : 'No'}</Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.getValue(id) ? 'Si' : 'No';
        return value.includes(val);
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => <EditModal Equipo={row.original} />,
      enableSorting: false,
    },
  ];
}

const DocumentsTable = ({ data, savedVisibility, savedFilters }: DocumentsTableProps) => {
  const multiresourceOptions = createFilterOptions(data, (doc) => (doc.multiresource ? 'Si' : 'No'));

  const specialOptions = createFilterOptions(data, (doc) => (doc.special ? 'Si' : 'No'));

  const monthlyOptions = createFilterOptions(data, (doc) => (doc.monthly ? 'Si' : 'No'));

  const expiredOptions = createFilterOptions(data, (doc) => (doc.expired ? 'Si' : 'No'));

  const mandatoryOptions = createFilterOptions(data, (doc) => (doc.mandatory ? 'Si' : 'No'));

  const privateOptions = createFilterOptions(data, (doc) => (doc.private ? 'Si' : 'No'));

  const nameOptions = createFilterOptions(data, (doc) => doc.name);

  return (
    <BaseDataTable
      columns={getDocumentColumns()}
      data={data}
      savedVisibility={savedVisibility}
      toolbarOptions={{
        initialVisibleFilters: savedFilters || [],
        filterableColumns: [
          { columnId: 'Nombre', title: 'Nombre', options: nameOptions },
          { columnId: 'Multirecurso', title: 'Multirecurso', options: multiresourceOptions },
          { columnId: 'Especial', title: 'Especial', options: specialOptions },
          { columnId: 'Mensual', title: 'Mensual', options: monthlyOptions },
          { columnId: 'Vence', title: 'Vence', options: expiredOptions },
          { columnId: 'Mandatorio', title: 'Mandatorio', options: mandatoryOptions },
          { columnId: 'Privado', title: 'Privado', options: privateOptions },
        ],
      }}
      tableId="document_type_employees"
    />
  );
};

export default DocumentsTable;
