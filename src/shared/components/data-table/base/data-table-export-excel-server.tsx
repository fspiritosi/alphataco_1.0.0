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
import type { ColumnFiltersState, SortingState, Table } from '@tanstack/react-table';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';

interface DataTableExportExcelServerProps<TData> {
  table: Table<TData>;
  fileName?: string;
  fetchAllData: (options: { sorting: SortingState; columnFilters: ColumnFiltersState }) => Promise<TData[]>;
}

export function DataTableExportExcelServer<TData>({
  table,
  fileName = 'tabla_exportada',
  fetchAllData,
}: DataTableExportExcelServerProps<TData>) {
  const [open, setOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState(fileName);
  const [isExporting, setIsExporting] = useState(false);

  // Obtiene solo las columnas visibles
  const columns = table.getVisibleLeafColumns();

  // Construye los headers
  const headers: string[] = columns.map((col) => {
    return col.id || ((col.columnDef as any).accessorKey as string);
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Obtener el estado actual de filtros y ordenamiento
      const currentSorting = table.getState().sorting;
      const currentFilters = table.getState().columnFilters;

      console.log('🚀 Exportando datos con filtros:', {
        sorting: currentSorting,
        filters: currentFilters,
      });

      // Obtener todos los datos con los filtros aplicados
      const allData = await fetchAllData({
        sorting: currentSorting,
        columnFilters: currentFilters,
      });

      console.log('📊 Datos obtenidos para exportar:', allData.length);

      // Procesar los datos para exportar
      const exportData = allData.map((rowData) => {
        const rowObj: Record<string, any> = {};
        columns.forEach((col, idx) => {
          // Obtener el valor usando el accessorKey o id de la columna
          const accessorKey = (col.columnDef as any).accessorKey || col.id;
          let value = getNestedValue(rowData, accessorKey);

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
          } else if (typeof value === 'object' && value !== null) {
            // Para objetos anidados, intentar extraer propiedades útiles
            if (value.name) {
              value = value.name;
            } else {
              value = JSON.stringify(value);
            }
          }

          rowObj[headers[idx]] = value || '-';
        });
        return rowObj;
      });

      // Crear el archivo Excel
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
    } catch (error) {
      console.error('❌ Error al exportar:', error);
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="Exportar a Excel"
          className="flex items-center gap-2"
          disabled={isExporting}
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar a Excel</DialogTitle>
          <DialogDescription>
            ¿Deseas exportar la tabla completa a Excel? Se exportarán todas las filas que coincidan con los filtros
            actuales y solo las columnas visibles.
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="ml-2" disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Exportando...
              </>
            ) : (
              'Exportar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Función auxiliar para obtener valores anidados de un objeto
function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return obj;

  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}
