# Informe del Gestor de Pedidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Generar Informe" al Gestor de Pedidos que abre un modal con filtros (fecha, cliente, estados, agrupación) y genera un Excel (.xlsx) con hoja de resumen (% por estado) y hoja de detalle (líneas agrupadas por estado).

**Architecture:** Server action con Prisma query para obtener datos + cálculos de porcentajes. El modal usa zod + RHF. La generación del Excel se hace client-side con ExcelJS (ya existe `src/shared/lib/excel-export.ts`). El server action retorna datos crudos y el cliente construye el workbook con 2 hojas.

**Tech Stack:** Prisma, ExcelJS, zod, react-hook-form, shadcn Dialog, moment.js

---

## File Map

| Archivo                                                                | Acción    | Responsabilidad                                              |
| ---------------------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| `src/features/Operaciones/Preparte/actions/preparte.ts`                | Modificar | Agregar `getPreparteReportData()` server action              |
| `src/features/Operaciones/Preparte/components/PreparteReportModal.tsx` | Crear     | Modal con formulario de filtros + lógica de generación Excel |
| `src/features/Operaciones/Preparte/components/PreparteManager.tsx`     | Modificar | Agregar botón "Generar Informe" y estado del modal           |

---

### Task 1: Server Action — `getPreparteReportData()`

**Files:**

- Modify: `src/features/Operaciones/Preparte/actions/preparte.ts`

- [ ] **Step 1: Agregar la server action al final del archivo**

Agregar esta función al final de `src/features/Operaciones/Preparte/actions/preparte.ts`:

```typescript
import { prisma } from '@/shared/lib/prisma';
import { preparte_status } from '@prisma/client';

// Tipo para los filtros del reporte
export type PreparteReportFilters = {
  from: string; // ISO date string YYYY-MM-DD
  to: string; // ISO date string YYYY-MM-DD
  clientIds?: string[]; // UUIDs de clientes (vacío = todos)
  statuses?: preparte_status[]; // estados a incluir (vacío = todos)
  groupBy: 'line' | 'order'; // agrupar por línea o por numero_pedido
};

// Tipo para cada línea del detalle del reporte
export type PreparteReportDetail = {
  id: string;
  numero_pedido: string | null;
  clientName: string;
  contractName: string;
  itemName: string | null;
  requestDate: string | null;
  executionDate: string | null;
  status: string;
  solicitante: string;
  observaciones: string | null;
};

// Tipo para el resumen del reporte
export type PreparteReportSummary = {
  from: string;
  to: string;
  clientNames: string;
  total: number;
  byStatus: Record<string, { count: number; percentage: number }>;
  shiftPercentage: number; // % reprogramados (corrimiento)
  lostPercentage: number; // % rechazados + vencidos
};

// Tipo para el resultado completo del reporte
export type PreparteReportResult = {
  summary: PreparteReportSummary;
  details: PreparteReportDetail[];
};

export async function getPreparteReportData(filters: PreparteReportFilters): Promise<PreparteReportResult> {
  logger.info('Generando reporte de preparte', { data: { filters } });

  try {
    // Construir where clause
    const where: Record<string, unknown> = {
      OR: [
        {
          executionDate: {
            gte: new Date(`${filters.from}T00:00:00Z`),
            lte: new Date(`${filters.to}T23:59:59Z`),
          },
        },
        {
          executionDate: null,
          requestDate: {
            gte: new Date(`${filters.from}T00:00:00Z`),
            lte: new Date(`${filters.to}T23:59:59Z`),
          },
        },
      ],
    };

    if (filters.clientIds && filters.clientIds.length > 0) {
      where.cliente_id = { in: filters.clientIds };
    }

    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    const data = await prisma.preparte.findMany({
      where,
      select: {
        id: true,
        numero_pedido: true,
        status: true,
        solicitante: true,
        observaciones: true,
        executionDate: true,
        requestDate: true,
        customers: { select: { name: true } },
        customer_services: { select: { service_name: true } },
        service_items: { select: { item_name: true } },
      },
      orderBy: [{ status: 'asc' }, { executionDate: 'asc' }],
    });

    const total = data.length;

    // Contar por estado
    const statusCounts: Record<string, number> = {};
    for (const row of data) {
      const s = row.status || 'sin_estado';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // Calcular porcentajes
    const byStatus: Record<string, { count: number; percentage: number }> = {};
    for (const [status, count] of Object.entries(statusCounts)) {
      byStatus[status] = {
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      };
    }

    const reprogramadoCount = statusCounts['reprogramado'] || 0;
    const rechazadoCount = statusCounts['rechazado'] || 0;
    const vencidoCount = statusCounts['vencido'] || 0;

    // Resolver nombres de clientes para el resumen
    let clientNames = 'Todos';
    if (filters.clientIds && filters.clientIds.length > 0) {
      const uniqueNames = [...new Set(data.map((d) => d.customers?.name).filter(Boolean))];
      clientNames = uniqueNames.join(', ') || 'Todos';
    }

    const summary: PreparteReportSummary = {
      from: filters.from,
      to: filters.to,
      clientNames,
      total,
      byStatus,
      shiftPercentage: total > 0 ? Math.round((reprogramadoCount / total) * 10000) / 100 : 0,
      lostPercentage: total > 0 ? Math.round(((rechazadoCount + vencidoCount) / total) * 10000) / 100 : 0,
    };

    // Mapear detalle
    const details: PreparteReportDetail[] = data.map((row) => ({
      id: row.id,
      numero_pedido: row.numero_pedido,
      clientName: row.customers?.name || '-',
      contractName: row.customer_services?.service_name || '-',
      itemName: row.service_items?.item_name || null,
      requestDate: row.requestDate ? moment(row.requestDate).format('DD/MM/YYYY') : null,
      executionDate: row.executionDate ? moment(row.executionDate).format('DD/MM/YYYY') : null,
      status: row.status || 'sin_estado',
      solicitante: row.solicitante,
      observaciones: row.observaciones,
    }));

    return { summary, details };
  } catch (error) {
    logger.error('Error generando reporte de preparte', { data: { error } });
    throw error;
  }
}
```

**Nota importante:** El import de `prisma` ya existe en algunos archivos pero NO en este archivo (usa Supabase). Agregar el import al inicio junto con los existentes.

- [ ] **Step 2: Agregar los imports faltantes al inicio del archivo**

Al inicio de `src/features/Operaciones/Preparte/actions/preparte.ts`, junto a los imports existentes, agregar:

```typescript
import { prisma } from '@/shared/lib/prisma';
import { preparte_status } from '@prisma/client';
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: Sin errores en `preparte.ts`

---

### Task 2: Modal de Reporte — `PreparteReportModal.tsx`

**Files:**

- Create: `src/features/Operaciones/Preparte/components/PreparteReportModal.tsx`

- [ ] **Step 1: Crear el componente del modal**

Crear `src/features/Operaciones/Preparte/components/PreparteReportModal.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { preparte_status } from '@prisma/client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  getPreparteReportData,
  type PreparteReportResult,
} from '../actions/preparte';
import type { Cliente } from './PreparteManager';

const logger = new Logger('PreparteReportModal');

// Status labels (coinciden con StatusCardsServerContainer)
const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendientes',
  cancelado: 'Cancelados',
  reprogramado: 'Reprogramados',
  rechazado: 'Rechazados',
  vencido: 'Vencidos',
  confirmado: 'Confirmados',
};

const ALL_STATUSES = Object.values(preparte_status);

const reportSchema = z
  .object({
    from: z.string().min(1, 'La fecha desde es requerida'),
    to: z.string().min(1, 'La fecha hasta es requerida'),
    clientIds: z.array(z.string()).default([]),
    statuses: z.array(z.string()).default([]),
    groupBy: z.enum(['line', 'order']),
  })
  .refine((data) => data.to >= data.from, {
    message: 'La fecha hasta no puede ser menor que la fecha desde',
    path: ['to'],
  });

type ReportFormValues = z.infer<typeof reportSchema>;

interface PreparteReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Cliente[];
}

export function PreparteReportModal({
  open,
  onOpenChange,
  customers,
}: PreparteReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      from: '',
      to: '',
      clientIds: [],
      statuses: [],
      groupBy: 'line',
    },
  });

  async function onSubmit(values: ReportFormValues) {
    setIsGenerating(true);
    try {
      const result = await getPreparteReportData({
        from: values.from,
        to: values.to,
        clientIds: values.clientIds.length > 0 ? values.clientIds : undefined,
        statuses:
          values.statuses.length > 0
            ? (values.statuses as preparte_status[])
            : undefined,
        groupBy: values.groupBy,
      });

      if (result.summary.total === 0) {
        toast.warning('No se encontraron registros con los filtros seleccionados');
        setIsGenerating(false);
        return;
      }

      await generateExcel(result, values);
      toast.success('Informe generado exitosamente');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error generando reporte', { data: { error } });
      toast.error('Error al generar el informe');
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateExcel(
    result: PreparteReportResult,
    values: ReportFormValues
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Gestión';
    workbook.created = new Date();

    // ── Hoja 1: Resumen ──
    const summarySheet = workbook.addWorksheet('Resumen');

    // Título
    summarySheet.mergeCells('A1:L1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Informe del Gestor de Pedidos';
    titleCell.font = { bold: true, size: 16, color: { argb: '374151' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 35;

    // Fecha de generación
    summarySheet.mergeCells('A2:L2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Generado el ${moment().format('DD/MM/YYYY [a las] HH:mm')}`;
    dateCell.font = { size: 10, italic: true, color: { argb: '6b7280' } };
    dateCell.alignment = { horizontal: 'center' };

    // Headers del resumen (fila 4)
    const summaryHeaders = [
      'Desde',
      'Hasta',
      'Cliente(s)',
      'Total',
      '% Confirmados',
      '% Pendientes',
      '% Reprogramados',
      '% Cancelados',
      '% Rechazados',
      '% Vencidos',
      '% Corrimiento',
      '% Perdidos',
    ];

    const headerRow = summarySheet.getRow(4);
    summaryHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '374151' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'e5e7eb' } },
        bottom: { style: 'thin', color: { argb: 'e5e7eb' } },
        left: { style: 'thin', color: { argb: 'e5e7eb' } },
        right: { style: 'thin', color: { argb: 'e5e7eb' } },
      };
    });
    headerRow.height = 28;

    // Datos del resumen (fila 5)
    const { summary } = result;
    const pct = (status: string) => summary.byStatus[status]?.percentage ?? 0;

    const summaryData = [
      moment(summary.from).format('DD/MM/YYYY'),
      moment(summary.to).format('DD/MM/YYYY'),
      summary.clientNames,
      summary.total,
      `${pct('confirmado')}%`,
      `${pct('pendiente')}%`,
      `${pct('reprogramado')}%`,
      `${pct('cancelado')}%`,
      `${pct('rechazado')}%`,
      `${pct('vencido')}%`,
      `${summary.shiftPercentage}%`,
      `${summary.lostPercentage}%`,
    ];

    const dataRow = summarySheet.getRow(5);
    summaryData.forEach((val, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'e5e7eb' } },
        bottom: { style: 'thin', color: { argb: 'e5e7eb' } },
        left: { style: 'thin', color: { argb: 'e5e7eb' } },
        right: { style: 'thin', color: { argb: 'e5e7eb' } },
      };
    });

    // Anchos
    [12, 12, 30, 8, 14, 14, 16, 14, 14, 12, 14, 14].forEach((w, i) => {
      summarySheet.getColumn(i + 1).width = w;
    });

    // ── Hoja 2: Detalle ──
    const detailSheet = workbook.addWorksheet('Detalle');

    // Título
    detailSheet.mergeCells('A1:I1');
    const detailTitle = detailSheet.getCell('A1');
    detailTitle.value = `Detalle — ${values.groupBy === 'order' ? 'Agrupado por Pedido' : 'Por Línea'}`;
    detailTitle.font = { bold: true, size: 14, color: { argb: '374151' } };
    detailTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    detailSheet.getRow(1).height = 30;

    if (values.groupBy === 'line') {
      // ── Modo Línea ──
      const detailHeaders = [
        'Nro Pedido',
        'Cliente',
        'Contrato',
        'Ítem',
        'Fecha Solicitud',
        'Fecha Ejecución',
        'Estado',
        'Solicitante',
        'Observaciones',
      ];

      const dHeaderRow = detailSheet.getRow(3);
      detailHeaders.forEach((h, i) => {
        const cell = dHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '374151' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'e5e7eb' } },
          bottom: { style: 'thin', color: { argb: 'e5e7eb' } },
          left: { style: 'thin', color: { argb: 'e5e7eb' } },
          right: { style: 'thin', color: { argb: 'e5e7eb' } },
        };
      });
      dHeaderRow.height = 28;

      // Ordenar por estado, luego por fecha ejecución
      const sorted = [...result.details].sort((a, b) => {
        if (a.status !== b.status) return a.status.localeCompare(b.status);
        return (a.executionDate || '').localeCompare(b.executionDate || '');
      });

      let currentStatus = '';
      let rowIndex = 4;

      for (const detail of sorted) {
        // Separador de grupo por estado
        if (detail.status !== currentStatus) {
          currentStatus = detail.status;
          const groupRow = detailSheet.getRow(rowIndex);
          detailSheet.mergeCells(rowIndex, 1, rowIndex, 9);
          const groupCell = groupRow.getCell(1);
          const statusLabel = STATUS_LABELS[currentStatus] || currentStatus;
          const statusCount = summary.byStatus[currentStatus]?.count ?? 0;
          const statusPct = summary.byStatus[currentStatus]?.percentage ?? 0;
          groupCell.value = `${statusLabel} (${statusCount} — ${statusPct}%)`;
          groupCell.font = { bold: true, size: 12, color: { argb: '1f2937' } };
          groupCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'e5e7eb' },
          };
          groupCell.alignment = { vertical: 'middle' };
          groupRow.height = 24;
          rowIndex++;
        }

        const row = detailSheet.getRow(rowIndex);
        const values = [
          detail.numero_pedido || '-',
          detail.clientName,
          detail.contractName,
          detail.itemName || '-',
          detail.requestDate || '-',
          detail.executionDate || '-',
          STATUS_LABELS[detail.status] || detail.status,
          detail.solicitante,
          detail.observaciones || '-',
        ];

        values.forEach((val, i) => {
          const cell = row.getCell(i + 1);
          cell.value = val;
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'e5e7eb' } },
            bottom: { style: 'thin', color: { argb: 'e5e7eb' } },
            left: { style: 'thin', color: { argb: 'e5e7eb' } },
            right: { style: 'thin', color: { argb: 'e5e7eb' } },
          };
          // Filas alternadas
          if ((rowIndex - 4) % 2 === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f9fafb' },
            };
          }
        });

        rowIndex++;
      }

      [14, 25, 25, 25, 14, 14, 16, 20, 30].forEach((w, i) => {
        detailSheet.getColumn(i + 1).width = w;
      });
    } else {
      // ── Modo Pedido ──
      const detailHeaders = [
        'Nro Pedido',
        'Cliente',
        'Contrato',
        'Cant. Líneas',
        'Fecha Solicitud',
        'Fecha Ejecución',
        'Estado',
        'Solicitante',
      ];

      const dHeaderRow = detailSheet.getRow(3);
      detailHeaders.forEach((h, i) => {
        const cell = dHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '374151' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'e5e7eb' } },
          bottom: { style: 'thin', color: { argb: 'e5e7eb' } },
          left: { style: 'thin', color: { argb: 'e5e7eb' } },
          right: { style: 'thin', color: { argb: 'e5e7eb' } },
        };
      });
      dHeaderRow.height = 28;

      // Agrupar por numero_pedido
      const orderMap = new Map<
        string,
        {
          numero_pedido: string;
          clientName: string;
          contractName: string;
          lineCount: number;
          requestDate: string | null;
          executionDate: string | null;
          statuses: string[];
          solicitante: string;
        }
      >();

      for (const detail of result.details) {
        const key = detail.numero_pedido || detail.id;
        const existing = orderMap.get(key);
        if (existing) {
          existing.lineCount++;
          if (!existing.statuses.includes(detail.status)) {
            existing.statuses.push(detail.status);
          }
        } else {
          orderMap.set(key, {
            numero_pedido: detail.numero_pedido || '-',
            clientName: detail.clientName,
            contractName: detail.contractName,
            lineCount: 1,
            requestDate: detail.requestDate,
            executionDate: detail.executionDate,
            statuses: [detail.status],
            solicitante: detail.solicitante,
          });
        }
      }

      // Ordenar por estado predominante, luego por fecha
      const orders = [...orderMap.values()].sort((a, b) => {
        const aStatus = a.statuses[0] || '';
        const bStatus = b.statuses[0] || '';
        if (aStatus !== bStatus) return aStatus.localeCompare(bStatus);
        return (a.executionDate || '').localeCompare(b.executionDate || '');
      });

      let currentStatus = '';
      let rowIndex = 4;

      for (const order of orders) {
        const predominantStatus = order.statuses[0] || '';

        // Separador de grupo
        if (predominantStatus !== currentStatus) {
          currentStatus = predominantStatus;
          const groupRow = detailSheet.getRow(rowIndex);
          detailSheet.mergeCells(rowIndex, 1, rowIndex, 8);
          const groupCell = groupRow.getCell(1);
          const statusLabel = STATUS_LABELS[currentStatus] || currentStatus;
          const statusCount = summary.byStatus[currentStatus]?.count ?? 0;
          const statusPct = summary.byStatus[currentStatus]?.percentage ?? 0;
          groupCell.value = `${statusLabel} (${statusCount} — ${statusPct}%)`;
          groupCell.font = { bold: true, size: 12, color: { argb: '1f2937' } };
          groupCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'e5e7eb' },
          };
          groupCell.alignment = { vertical: 'middle' };
          groupRow.height = 24;
          rowIndex++;
        }

        const row = detailSheet.getRow(rowIndex);
        const statusDisplay = order.statuses
          .map((s) => STATUS_LABELS[s] || s)
          .join(', ');

        const rowValues = [
          order.numero_pedido,
          order.clientName,
          order.contractName,
          order.lineCount,
          order.requestDate || '-',
          order.executionDate || '-',
          statusDisplay,
          order.solicitante,
        ];

        rowValues.forEach((val, i) => {
          const cell = row.getCell(i + 1);
          cell.value = val;
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'e5e7eb' } },
            bottom: { style: 'thin', color: { argb: 'e5e7eb' } },
            left: { style: 'thin', color: { argb: 'e5e7eb' } },
            right: { style: 'thin', color: { argb: 'e5e7eb' } },
          };
          if ((rowIndex - 4) % 2 === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f9fafb' },
            };
          }
        });

        rowIndex++;
      }

      [14, 25, 25, 12, 14, 14, 20, 20].forEach((w, i) => {
        detailSheet.getColumn(i + 1).width = w;
      });
    }

    // Descargar
    const fromFormatted = moment(values.from).format('DDMMYYYY');
    const toFormatted = moment(values.to).format('DDMMYYYY');
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Informe_Pedidos_${fromFormatted}_${toFormatted}.xlsx`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generar Informe</DialogTitle>
          <DialogDescription>
            Seleccione los filtros para generar el informe de pedidos
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desde</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasta</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Clientes - multiselect con checkboxes */}
            <FormField
              control={form.control}
              name="clientIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Clientes{' '}
                    <span className="text-muted-foreground font-normal">
                      (vacío = todos)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                      {customers.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-1 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={field.value.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, c.id]);
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== c.id)
                                );
                              }
                            }}
                            className="rounded"
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estados - multiselect con checkboxes */}
            <FormField
              control={form.control}
              name="statuses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Estados{' '}
                    <span className="text-muted-foreground font-normal">
                      (vacío = todos)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-1 border rounded-md p-2">
                      {ALL_STATUSES.map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-1 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={field.value.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, s]);
                              } else {
                                field.onChange(
                                  field.value.filter((v) => v !== s)
                                );
                              }
                            }}
                            className="rounded"
                          />
                          {STATUS_LABELS[s] || s}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Agrupar por */}
            <FormField
              control={form.control}
              name="groupBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agrupar por</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="line" id="group-line" />
                        <Label htmlFor="group-line">Línea</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="order" id="group-order" />
                        <Label htmlFor="group-order">Pedido</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Generar Informe
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: Sin errores en `PreparteReportModal.tsx`

---

### Task 3: Integrar botón en PreparteManager

**Files:**

- Modify: `src/features/Operaciones/Preparte/components/PreparteManager.tsx`

- [ ] **Step 1: Agregar import del modal**

Al inicio del archivo, agregar:

```typescript
import { PreparteReportModal } from './PreparteReportModal';
import { FileSpreadsheet } from 'lucide-react';
```

- [ ] **Step 2: Agregar estado para el modal**

Dentro de la función `PreparteManager`, después de `const [isLoading, setIsLoading] = useState(false);`:

```typescript
const [reportModalOpen, setReportModalOpen] = useState(false);
```

- [ ] **Step 3: Agregar botón y modal al JSX**

En el JSX, agregar el botón "Generar Informe" junto al botón "Nuevo Pedido" (dentro del `div` con `flex justify-between`). Agregar el botón ANTES del `PermissionGuard` de "Nuevo Pedido":

```tsx
<Button variant="outline" onClick={() => setReportModalOpen(true)}>
  <FileSpreadsheet className="mr-2 h-4 w-4" />
  Generar Informe
</Button>
```

Y agregar el modal antes del cierre del componente (justo antes del `</div>` final):

```tsx
<PreparteReportModal open={reportModalOpen} onOpenChange={setReportModalOpen} customers={Customers} />
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types`
Expected: Sin errores

---

### Task 4: Verificación final

- [ ] **Step 1: Verificar que compila todo**

Run: `npm run check-types`
Expected: 0 errores

- [ ] **Step 2: Verificar visualmente**

Abrir `/dashboard/operations?tab=preparte` y verificar:

1. El botón "Generar Informe" aparece junto a "Nuevo Pedido"
2. Al hacer click abre el modal con los filtros
3. Los clientes aparecen en la lista de checkboxes
4. Los estados aparecen correctamente
5. Completar filtros y generar — debe descargar un .xlsx
6. Verificar Hoja 1 (Resumen) con los % correctos
7. Verificar Hoja 2 (Detalle) agrupado por estado
