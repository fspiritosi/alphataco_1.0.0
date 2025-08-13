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

  // Obtiene solo las columnas visibles y excluye las que tienen excludeFromExport: true
  const columns = table.getVisibleLeafColumns().filter((col) => {
    const columnDef = col.columnDef as any;
    return !columnDef.excludeFromExport;
  });

  // Construye los headers usando el título de la columna
  const headers: string[] = columns.map((col) => {
    // Intentar obtener el header de la columna
    const columnDef = col.columnDef as any;

    // Si el header es una función, intentar extraer el título
    if (typeof columnDef.header === 'function') {
      // Para headers que usan DataTableColumnHeader, intentar extraer el título
      try {
        const headerElement = columnDef.header({ column: col });
        if (headerElement && headerElement.props && headerElement.props.title) {
          return headerElement.props.title;
        }
      } catch (e) {
        // Si falla, continuar con la lógica de fallback
      }
    }

    // Si el header es un string, usarlo directamente
    if (typeof columnDef.header === 'string') {
      return columnDef.header;
    }

    // Fallback al id o accessorKey
    return col.id || columnDef.accessorKey || 'Columna';
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
          const columnDef = col.columnDef as any;

          // Usar exportFormatter personalizado si está disponible
          if (columnDef.exportFormatter && typeof columnDef.exportFormatter === 'function') {
            value = columnDef.exportFormatter(value, rowData);
          } else {
            // Lógica de formateo por defecto
            value = formatValueForExport(value, headers[idx]);
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

// Función para formatear valores por defecto en la exportación
function formatValueForExport(value: any, columnHeader: string): string {
  // Si el valor es null o undefined, retornar '-'
  if (value === null || value === undefined) {
    return '-';
  }

  // Si es un array, unir los elementos con comas
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '-';
    }
    // Si los elementos del array son objetos con propiedad 'name', extraerla
    const formattedItems = value
      .map((item) => {
        if (typeof item === 'object' && item !== null && item.name) {
          return item.name;
        }
        return String(item);
      })
      .filter(Boolean);

    return formattedItems.length > 0 ? formattedItems.join(', ') : '-';
  }

  // Si es un objeto, intentar extraer propiedades útiles
  if (typeof value === 'object' && value !== null) {
    // Si tiene propiedad 'name', usarla
    if (value.name) {
      return String(value.name);
    }
    // Si es una fecha, formatearla
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return String(value);
      }
    }
    // Como último recurso, convertir a JSON string
    return JSON.stringify(value);
  }

  // Si es un boolean, convertir a texto legible
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  // Para cualquier otro tipo, convertir a string
  return String(value);
}
