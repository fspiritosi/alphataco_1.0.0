'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/verActivosButton';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { use, useState } from 'react';
import { useKpiStore } from '../store/kpi.store';
import { KPI } from '../types';
import { KpiDetailModal } from './KpiDetailModal';

export function getKpisColumns(
  onEdit: (kpi: KPI) => void,
  onView: (kpi: KPI) => void,
  canEdit: boolean
): ColumnDef<KPI>[] {
  const columns: ColumnDef<KPI>[] = [
    {
      accessorKey: 'code',
      id: 'Código',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
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
      accessorKey: 'number',
      id: 'Número',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.number || <span className="text-muted-foreground">-</span>}</span>
      ),
    },
    {
      accessorKey: 'validity_date',
      id: 'Vigencia',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vigencia" />,
      cell: ({ row }) => {
        const date = row.original.validity_date;
        if (!date) return <span className="text-muted-foreground">-</span>;
        try {
          return <span>{format(new Date(date), 'dd/MM/yyyy', { locale: es })}</span>;
        } catch {
          return <span>{date}</span>;
        }
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
  ];

  if (canEdit) {
    columns.push({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onView(row.original)}>
            Ver
          </Button>
          <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
            Editar
          </Button>
        </div>
      ),
      enableSorting: false,
    });
  } else {
    columns.push({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onView(row.original)}>
          Ver
        </Button>
      ),
      enableSorting: false,
    });
  }

  return columns;
}

export function KpisTable({
  kpis,
  savedVisibility,
  savedFilter,
}: {
  kpis: Promise<KPI[]>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const kpisData = use(kpis);
  const onEdit = useKpiStore((state) => state.setKpi);
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filteredData, setFilteredData] = useState<KPI[]>(kpisData);
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('empresa', 'kpis', 'update');

  const handleView = (kpi: KPI) => {
    setSelectedKpi(kpi);
    setIsDetailModalOpen(true);
  };

  const names = createFilterOptions(filteredData, (kpi) => kpi.name);
  const codes = createFilterOptions(filteredData, (kpi) => kpi.code);

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">KPIs</h2>
          <VerActivosButton data={kpisData} filterKey="is_active" onFilteredChange={setFilteredData} />
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto w-full">
          <BaseDataTable
            savedVisibility={savedVisibility}
            columns={getKpisColumns(onEdit, handleView, canEdit)}
            data={filteredData}
            tableId="kpis-table"
            toolbarOptions={{
              initialVisibleFilters: savedFilter || [],
              showFilterOptions: true,
              filterableColumns: [
                {
                  columnId: 'Nombre',
                  title: 'Nombre',
                  options: names,
                },
                {
                  columnId: 'Código',
                  title: 'Código',
                  options: codes,
                },
              ],
            }}
          />
        </div>
      </div>

      {selectedKpi && (
        <KpiDetailModal
          kpi={selectedKpi}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedKpi(null);
          }}
        />
      )}
    </>
  );
}
