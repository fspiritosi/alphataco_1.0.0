'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { PencilIcon, TrashIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteMeasureUnit, fetchMeasureUnits } from './actions/actions';

// Definir los tipos para las propiedades
interface MensureUnitsTableProps {
  units: Awaited<ReturnType<typeof fetchMeasureUnits>>;
  setSelectedUnit: (unit: Awaited<ReturnType<typeof fetchMeasureUnits>>[number] | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}

function MensureUnitsTable({ units, setSelectedUnit, setMode, savedVisibility, savedFilters }: MensureUnitsTableProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Awaited<ReturnType<typeof fetchMeasureUnits>>[number] | null>(null);

  // Función para editar una unidad de medida
  const handleEdit = (unit: Awaited<ReturnType<typeof fetchMeasureUnits>>[number]) => {
    setSelectedUnit(unit);
    setMode('edit');
  };

  // Función para mostrar el diálogo de confirmación de eliminación
  const handleDeleteRequest = (unit: Awaited<ReturnType<typeof fetchMeasureUnits>>[number]) => {
    setUnitToDelete(unit);
    setConfirmDialogOpen(true);
  };
  const router = useRouter();

  // Función para eliminar una unidad de medida
  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;

    try {
      const result = await deleteMeasureUnit(unitToDelete.id);
      if (result.status === 200) {
        toast.success(result.body);
        router.refresh();
      } else {
        toast.error(result.body);
      }
    } catch (error) {
      console.error('Error al eliminar la unidad de medida:', error);
      toast.error('Error al eliminar la unidad de medida');
    } finally {
      setConfirmDialogOpen(false);
      setUnitToDelete(null);
    }
  };

  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'mensure_units', 'update');

  // Definir las columnas de la tabla
  const columns: ColumnDef<Awaited<ReturnType<typeof fetchMeasureUnits>>[number]>[] = [
    {
      accessorKey: 'simbol',
      header: 'Símbolo',
      id: 'Símbolo',
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'unit',
      header: 'Unidad',
      id: 'Unidad',
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      id: 'Tipo',
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];

  // Conditionally add actions column
  if (canEdit) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const unit = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)} title="Editar unidad">
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(unit)} title="Eliminar unidad">
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    });
  }

  const simbols = createFilterOptions(units, (unit) => unit.simbol);
  const unitsOptions = createFilterOptions(units, (unit) => unit.unit);
  const types = createFilterOptions(units, (unit) => unit.tipo);
  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <h2 className="text-xl font-bold">Unidades de Medida</h2>

      <div>
        <BaseDataTable
          columns={columns}
          data={units}
          savedVisibility={savedVisibility}
          tableId="meanureUnitsTable"
          toolbarOptions={{
            initialVisibleFilters: savedFilters,
            filterableColumns: [
              {
                columnId: 'Símbolo',
                title: 'Símbolo',
                options: simbols,
              },
              {
                columnId: 'Unidad',
                title: 'Unidad',
                options: unitsOptions,
              },
              {
                columnId: 'Tipo',
                title: 'Tipo',
                options: types,
              },
            ],
          }}
        />
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar unidad de medida</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la unidad {unitToDelete?.simbol}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MensureUnitsTable;
