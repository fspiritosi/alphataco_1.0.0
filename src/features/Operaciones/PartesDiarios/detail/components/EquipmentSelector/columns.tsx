'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels, employeeStatusLabels } from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Settings2, Truck, Wrench, XCircle } from 'lucide-react';
import type { EquipmentSelectorItem } from './actions.server';

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'chassis',
  'engine',
  'serie',
  'kilometer',
  'sub_type',
  'type_of_vehicle',
];

// ============================================================================
// CONDITION CONFIG
// ============================================================================

export const conditionIcons: Record<string, typeof CheckCircle2 | undefined> = {
  operativo: CheckCircle2,
  no_operativo: XCircle,
  en_reparacion: Wrench,
  operativo_condicionado: AlertTriangle,
  en_preparacion: Settings2,
};

type BadgeVariant = 'success' | 'destructive' | 'yellow' | 'info' | 'secondary' | 'default';

const conditionBadgeVariant: Record<string, BadgeVariant> = {
  operativo: 'success',
  no_operativo: 'destructive',
  en_reparacion: 'yellow',
  operativo_condicionado: 'info',
  en_preparacion: 'secondary',
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

interface GetColumnsOptions {
  alreadySelectedIds: string[];
  selectedCustomerId: string | null;
}

export function getColumns(options: GetColumnsOptions): ColumnDef<EquipmentSelectorItem>[] {
  const { alreadySelectedIds, selectedCustomerId } = options;

  return [
    // ── Select ────────────────────────────────────────────────────────────────
    {
      id: 'select',
      meta: { excludeFromExport: true },
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => {
        const isAlreadySelected = alreadySelectedIds.includes(row.original.id);
        return (
          <Checkbox
            checked={isAlreadySelected || row.getIsSelected()}
            onCheckedChange={(value) => {
              if (!isAlreadySelected) row.toggleSelected(!!value);
            }}
            disabled={isAlreadySelected}
            aria-label="Seleccionar fila"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },

    // ── Dominio ───────────────────────────────────────────────────────────────
    {
      accessorKey: 'domain',
      meta: { title: 'Dominio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
      cell: ({ row }) => {
        const isAssigned = selectedCustomerId
          ? row.original.contractor_equipment?.some((ce) => ce.customers?.id === selectedCustomerId)
          : true;

        return (
          <div className="flex items-center gap-2">
            <Truck className={isAssigned ? 'h-4 w-4 text-muted-foreground' : 'h-4 w-4 text-orange-500'} />
            <div className="flex flex-col gap-1">
              <span className={!isAssigned ? 'text-orange-700 font-medium' : 'font-medium'}>
                {row.original.domain || '—'}
              </span>
              {!isAssigned && (
                <Badge
                  variant="outline"
                  className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] py-0 px-1 w-fit"
                >
                  No asignado
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },

    // ── Nro Interno ──────────────────────────────────────────────────────────
    {
      accessorKey: 'intern_number',
      meta: { title: 'Nro Interno' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nro Interno" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.intern_number || '—'}</span>,
    },

    // ── Tipo (type — model `type`) ────────────────────────────────────────────
    {
      id: 'type',
      accessorFn: (row) => row.type_vehicles_typeTotype?.name ?? '',
      meta: { title: 'Tipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => <span>{row.original.type_vehicles_typeTotype?.name || '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.type_vehicles_typeTotype?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Estado (status) ───────────────────────────────────────────────────────
    {
      accessorKey: 'status',
      meta: { title: 'Estado doc.' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado doc." />,
      cell: ({ row }) => {
        const s = row.original.status;
        if (!s) return <span className="text-muted-foreground">—</span>;
        const label = employeeStatusLabels[s] ?? s;
        const variantMap: Record<string, BadgeVariant> = {
          Completo: 'success',
          Incompleto: 'destructive',
          Completo_con_doc_vencida: 'yellow',
          Avalado: 'success',
          No_avalado: 'destructive',
        };
        return <Badge variant={variantMap[s] ?? 'default'}>{label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Condición (condition) ─────────────────────────────────────────────────
    {
      accessorKey: 'condition',
      meta: { title: 'Condición' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => {
        const c = row.original.condition;
        if (!c) return <span className="text-muted-foreground">—</span>;
        const label = conditionLabels[c] ?? c;
        const Icon = conditionIcons[c];
        const variant = conditionBadgeVariant[c] ?? 'default';
        return (
          <Badge variant={variant} className="flex items-center gap-1 w-fit">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Marca (brand) ─────────────────────────────────────────────────────────
    {
      id: 'brand',
      accessorFn: (row) => row.brand_vehicles?.name ?? '',
      meta: { title: 'Marca' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => <span>{row.original.brand_vehicles?.name || '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.brand_vehicles?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(id));
      },
    },

    // ── Modelo (model) ────────────────────────────────────────────────────────
    {
      id: 'model',
      accessorFn: (row) => row.model_vehicles?.name ?? '',
      meta: { title: 'Modelo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo" />,
      cell: ({ row }) => <span>{row.original.model_vehicles?.name || '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.model_vehicles?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(id));
      },
    },

    // ── Año ───────────────────────────────────────────────────────────────────
    {
      accessorKey: 'year',
      meta: { title: 'Año' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
      cell: ({ row }) => <span>{row.original.year || '—'}</span>,
    },

    // ── Afectado a (contractor_equipment M:M) ─────────────────────────────────
    {
      id: 'contractor_equipment',
      accessorFn: (row) => {
        const contractors = row.contractor_equipment ?? [];
        return contractors
          .map((c) => c.customers?.name ?? '')
          .filter(Boolean)
          .join(', ');
      },
      meta: { title: 'Afectado a' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectado a" />,
      cell: ({ row }) => {
        const contractors = row.original.contractor_equipment ?? [];
        if (contractors.length === 0) {
          return <Badge variant="secondary">Sin afectar</Badge>;
        }
        const names = contractors.map((c) => c.customers?.name ?? '').filter(Boolean);
        const first = names[0] ?? '—';
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex">
                  <Badge>
                    {first}
                    {names.length > 1 && ` +${names.length - 1}`}
                  </Badge>
                </div>
              </TooltipTrigger>
              {names.length > 1 && (
                <TooltipContent className="text-white bg-black rounded-lg p-2">
                  <div className="flex flex-col gap-1">
                    {names.map((name, idx) => (
                      <span key={idx}>{name}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const contractors = row.original.contractor_equipment ?? [];
        if (contractors.length === 0) return value.includes(NULL_FILTER_VALUE);
        return contractors.some((c) => c.customers?.id && value.includes(c.customers.id));
      },
      enableSorting: false,
    },

    // ── Kilómetros ────────────────────────────────────────────────────────────
    {
      accessorKey: 'kilometer',
      meta: { title: 'Kilómetros' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilómetros" />,
      cell: ({ row }) => {
        const km = row.original.kilometer;
        if (!km || km === '0') return <span className="text-muted-foreground">—</span>;
        return <Badge variant="outline">{km} km</Badge>;
      },
    },

    // ── Chassis ───────────────────────────────────────────────────────────────
    {
      accessorKey: 'chassis',
      meta: { title: 'Chassis' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chassis" />,
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.chassis || '—'}</span>,
    },

    // ── Motor ─────────────────────────────────────────────────────────────────
    {
      accessorKey: 'engine',
      meta: { title: 'Motor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motor" />,
      cell: ({ row }) => <span className="text-sm">{row.original.engine || '—'}</span>,
    },

    // ── Serie ─────────────────────────────────────────────────────────────────
    {
      accessorKey: 'serie',
      meta: { title: 'Serie' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.serie || '—'}</span>,
    },

    // ── Sub Tipo (hidden by default) ──────────────────────────────────────────
    {
      id: 'sub_type',
      accessorFn: (row) => row.sub_type?.name ?? '',
      meta: { title: 'Sub Tipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sub Tipo" />,
      cell: ({ row }) => <span>{row.original.sub_type?.name || '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.sub_type?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Tipo de Vehículo (hidden by default) ──────────────────────────────────
    {
      id: 'type_of_vehicle',
      accessorFn: (row) => row.types_of_vehicles?.name ?? '',
      meta: { title: 'Tipo de Vehículo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Vehículo" />,
      cell: ({ row }) => <span>{row.original.types_of_vehicles?.name || '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.types_of_vehicles?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(id));
      },
    },
  ];
}
