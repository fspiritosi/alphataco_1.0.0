'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { formSourceLabels } from '@/shared/utils/mappers';
import { type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, ClipboardCheck, ClipboardList, FileText, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { FormsListItem } from './actions.server';

// ============================================================================
// COLUMNAS OCULTAS POR DEFECTO
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['code', 'source'];

// ============================================================================
// TIPO DE PERMISOS
// ============================================================================

type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

// ============================================================================
// COLUMNAS
// ============================================================================

export function getColumns(permissions: Permissions): ColumnDef<FormsListItem>[] {
  const canView = permissions.hasPermission('formularios', 'formularios', 'view');

  return [
    // ── Nombre del formulario ──────────────────────────────────────────────
    {
      accessorKey: 'name',
      meta: { title: 'Nombre' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        const href = `/dashboard/forms/${row.original.id}`;

        return (
          <div className={`flex items-center gap-2 ${!isActive ? 'opacity-50' : ''}`}>
            <TooltipProvider>
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div className="relative z-50">
                    <Badge variant="outline" className="shrink-0">
                      <ClipboardList className="h-3 w-3 mr-1.5" />
                      {row.original.total_responses}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Cantidad de respuestas: {row.original.total_responses}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {canView && isActive ? (
              <Link
                href={href}
                className="font-medium hover:underline truncate max-w-[350px]"
                title={row.original.name}
              >
                {row.original.name}
              </Link>
            ) : (
              <span
                className="font-medium truncate max-w-[350px]"
                title={isActive ? row.original.name : `${row.original.name} (Inactivo)`}
              >
                {row.original.name}
              </span>
            )}
          </div>
        );
      },
    },

    // ── Descripción ────────────────────────────────────────────────────────
    {
      accessorKey: 'description',
      meta: { title: 'Descripción' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => (
        <span
          className={`text-sm text-muted-foreground truncate max-w-[300px] block ${!row.original.is_active ? 'opacity-50' : ''}`}
        >
          {row.original.description || '—'}
        </span>
      ),
    },

    // ── Código (oculto por defecto) ─────────────────────────────────────────
    {
      accessorKey: 'code',
      meta: { title: 'Código' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => (
        <span className={`font-mono text-sm ${!row.original.is_active ? 'opacity-50' : ''}`}>
          {row.original.code || '—'}
        </span>
      ),
    },

    // ── Tipo de formulario / Fuente ────────────────────────────────────────
    {
      accessorKey: 'source',
      meta: { title: 'Tipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        const source = row.original.source;
        const isNormalized = source === 'checklist_template';
        return (
          <div className={`flex items-center gap-1.5 ${!row.original.is_active ? 'opacity-50' : ''}`}>
            {isNormalized ? (
              <ClipboardCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            )}
            <span className="text-sm whitespace-nowrap">{formSourceLabels[source]}</span>
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => value.includes(row.original.source),
      enableSorting: false,
    },

    // ── Estado (is_active) ────────────────────────────────────────────────
    {
      accessorKey: 'is_active',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <Badge variant={isActive ? 'success' : 'secondary'} className="whitespace-nowrap flex items-center gap-1">
            {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id);
        if (val == null) return value.includes('true');
        return value.includes(String(val));
      },
    },

    // ── Fecha de creación ─────────────────────────────────────────────────
    {
      accessorKey: 'created_at',
      meta: { title: 'Fecha de creación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creación" />,
      cell: ({ row }) => (
        <span className={`whitespace-nowrap text-sm ${!row.original.is_active ? 'opacity-50' : ''}`}>
          {moment(row.original.created_at).format('DD/MM/YYYY')}
        </span>
      ),
    },

    // ── Total de respuestas ────────────────────────────────────────────────
    {
      accessorKey: 'total_responses',
      meta: { title: 'Respuestas' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Respuestas" />,
      cell: ({ row }) => (
        <Badge
          variant={row.original.total_responses > 0 ? 'default' : 'secondary'}
          className={`min-w-[28px] justify-center ${!row.original.is_active ? 'opacity-50' : ''}`}
        >
          {row.original.total_responses}
        </Badge>
      ),
    },

    // ── Acciones ───────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const isActive = row.original.is_active;

        if (!canView || !isActive) {
          return null;
        }

        return (
          <Link
            href={`/dashboard/forms/${row.original.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
          >
            Ver formulario
          </Link>
        );
      },
    },
  ];
}
