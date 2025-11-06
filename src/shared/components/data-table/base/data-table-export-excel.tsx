'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Table } from '@tanstack/react-table';
import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';

interface DataTableExportExcelProps<TData> {
  table: Table<TData>;
  fileName?: string;
}

export function DataTableExportExcel<TData>({ table, fileName = 'tabla_exportada' }: DataTableExportExcelProps<TData>) {
  const [open, setOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState(fileName);

  // Obtiene las filas filtradas, sin paginación
  const rows = table.getFilteredRowModel().rows;
  // Obtiene solo las columnas visibles y excluye las que tienen excludeFromExport: true
  const columns = table.getVisibleLeafColumns().filter((col) => {
    const columnDef = col.columnDef as any;
    return !columnDef.excludeFromExport;
  });

  // Construye los datos para exportar
  // Extraer headers como texto plano (sin iconos)
  const headers: string[] = columns.map((col) => {
    const columnDef = col.columnDef as any;

    // 1. Prioridad: exportHeader personalizado
    if (columnDef.exportHeader) {
      return columnDef.exportHeader;
    }

    // 2. Si el header es un string, usarlo
    if (typeof columnDef.header === 'string') {
      return columnDef.header;
    }

    // 3. Fallback al id o accessorKey
    return col.id || columnDef.accessorKey || 'Columna';
  });

  const exportData = rows.map((row) => {
    const rowObj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      let value = row.getValue(col.id);
      const columnDef = col.columnDef as any;

      // Usar exportFormatter personalizado si está disponible
      if (columnDef.exportFormatter && typeof columnDef.exportFormatter === 'function') {
        value = columnDef.exportFormatter(value, row.original);
      } else {
        // Lógica de formateo por defecto
        // Procesar columna 'Afectaciones' de forma especial
        if (headers[idx].toLowerCase().includes('afectac')) {
          let parsed: any[] = [];
          try {
            parsed = typeof value === 'string' ? JSON.parse(value) : Array.isArray(value) ? value : [];
          } catch {
            parsed = [];
          }
          if (parsed.length === 0) {
            value = '-';
          } else {
            // Si hay objetos, extraer el nombre del contratista (contractor_id.name)
            const nombres = parsed.map((af: any) => af.contractor_id?.name).filter(Boolean);
            value = nombres.length > 0 ? nombres.join(', ') : '-';
          }
        } else if (Array.isArray(value)) {
          // Si es un array, unir con comas
          value = value.length > 0 ? value.join(', ') : '-';
        } else if (typeof value === 'object' && value !== null) {
          // Si es un objeto, intentar extraer 'name' o convertir a JSON
          value = (value as any).name || JSON.stringify(value);
        }
      }

      rowObj[headers[idx]] = value || '-';
    });
    return rowObj;
  });

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();

    // 1. Estilos para los headers (negrita y fondo gris claro)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || '');
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F2F2F2' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };
    }

    // 2. Ajuste automático del ancho de las columnas
    const allRows = [headers, ...exportData.map((row) => headers.map((h) => row[h]))];
    ws['!cols'] = headers.map((header, colIdx) => {
      // Calcula el ancho máximo entre el header y todas las celdas
      const maxLen = allRows.reduce((max, row) => {
        const val = row[colIdx] != null ? String(row[colIdx]) : '';
        return Math.max(max, val.length);
      }, header.length);
      return { wch: maxLen + 2 }; // +2 para algo de padding
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileNameInput || 'tabla_exportada'}.xlsx`, { compression: true });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="Exportar a Excel"
          className="flex items-center gap-2"
          disabled={rows.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar a Excel</DialogTitle>
          <DialogDescription>
            ¿Deseas exportar la tabla actual a Excel? Se exportarán solo las columnas visibles y todas las filas
            filtradas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fileName" className="text-right">
              Nombre del archivo
            </Label>
            <Input
              id="fileName"
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
              className="col-span-3"
              placeholder="tabla_exportada"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="ml-2">
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
