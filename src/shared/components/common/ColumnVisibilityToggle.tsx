import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table } from '@tanstack/react-table';
import { useEffect, useRef, useState } from 'react';

interface ColumnVisibilityToggleProps<TData> {
  table: Table<TData>;
  storageKey: string;
  role?: string | null;
}

export function ColumnVisibilityToggle<TData>({ table, storageKey, role }: ColumnVisibilityToggleProps<TData>) {
  const allColumns = table.getAllColumns().filter((col) => col.getCanHide());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const allSelected = visibleColumns?.length === allColumns?.length;
  const someSelected = visibleColumns?.length > 0 && !allSelected;

  const selectAllRef = useRef<HTMLInputElement>(null);

  //Inicialización: leer de localStorage o usar lo que la tabla ya tiene visible
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    let initialVisible: string[] = [];

    if (stored) {
      // Hay datos guardados
      const parsed = JSON.parse(stored);
      initialVisible = role === 'Invitado' ? parsed.filter((id: string) => id !== 'allocated_to') : parsed;
    } else {
      // Primer uso: usar lo que ya está visible en la tabla
      initialVisible = allColumns.filter((col) => col.getIsVisible()).map((col) => col.id);

      localStorage.setItem(storageKey, JSON.stringify(initialVisible));
    }

    allColumns.forEach((col) => {
      col.toggleVisibility(initialVisible.includes(col.id));
    });

    setVisibleColumns(initialVisible);
  }, [table, role]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const handleToggle = (columnId: string, isVisible: boolean) => {
    table.getColumn(columnId)?.toggleVisibility(isVisible);
    setVisibleColumns((prev) => (isVisible ? [...prev, columnId] : prev.filter((id) => id !== columnId)));
  };

  const toggleAll = (value: boolean) => {
    allColumns.forEach((col) => col.toggleVisibility(value));
    const newVisible = value
      ? allColumns.map((col) => col.id).filter((id) => !(role === 'Invitado' && id === 'allocated_to'))
      : [];
    setVisibleColumns(newVisible);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Columnas</Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 max-h-[50dvh] overflow-y-auto"
        align="end"
        side="bottom"
        sideOffset={4}
        avoidCollisions
        collisionPadding={10}
      >
        {/* Seleccionar todos */}
        <div className="flex items-center gap-2 py-1 border-b pb-2 mb-2">
          <Checkbox
            id="select-all"
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={(value) => toggleAll(!!value)}
          />
          <Label htmlFor="select-all" className="font-semibold">
            Seleccionar todos
          </Label>
        </div>
        {allColumns.find((col) => col.id === 'full_name') && (
          <div className="flex items-center gap-2 py-1">
            <Checkbox
              id="Nombre Completo"
              checked={visibleColumns.includes('full_name')}
              onCheckedChange={(value) => handleToggle('full_name', !!value)}
            />
            <Label htmlFor="Nombre Completo">Nombre Completo</Label>
          </div>
        )}

        {/* Columnas individuales */}
        {allColumns.map((column) => {
          if (
            column.id === 'actions' ||
            column.id === 'showUnavaliableEmployees' ||
            typeof column.columnDef.header !== 'string'
          ) {
            return null;
          }

          return (
            <div key={column.id} className="flex items-center gap-2 py-1">
              <Checkbox
                id={column.id}
                checked={visibleColumns.includes(column.id)}
                onCheckedChange={(value) => handleToggle(column.id, !!value)}
              />
              <Label htmlFor={column.id} className="capitalize">
                {column.columnDef.header}
              </Label>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
