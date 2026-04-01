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
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import _EmployeeSelectorDataTable from './_EmployeeSelectorDataTable';
import { getActiveEmployeesPaginated, type EmployeeSelectorItem } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'employee-selector';

// ============================================================================
// TYPES
// ============================================================================

export interface EmployeeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** IDs already assigned — these rows will have the checkbox checked + disabled */
  alreadySelectedIds: string[];
  /** If set, employees not contracted for this customer get an "No asignado" badge */
  selectedCustomerId: string | null;
  /** The date of the daily report — used for diagram deviation badges (YYYY-MM-DD) */
  reportDate: string;
  /** Called with the NEW selections (excluding already-selected ones) */
  onSelect: (selectedIds: string[]) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmployeeSelectorDialog({
  open,
  onOpenChange,
  alreadySelectedIds,
  selectedCustomerId,
  reportDate,
  onSelect,
}: EmployeeSelectorDialogProps) {
  // ─── Local state ──────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useState<DataTableSearchParams>({});
  const [newlySelectedRows, setNewlySelectedRows] = useState<EmployeeSelectorItem[]>([]);

  // Strip prefix from search params before passing to server action
  const tableParams = useMemo(() => stripPrefixFromSearchParams(searchParams, TABLE_ID), [searchParams]);

  // ─── Initial data via React Query ─────────────────────────────────────────
  const { data: initialData } = useQuery({
    queryKey: ['employee-selector-initial', reportDate],
    queryFn: () => getActiveEmployeesPaginated({}, reportDate),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Row selection handler ────────────────────────────────────────────────
  const handleRowSelectionChange = useCallback(
    (rows: EmployeeSelectorItem[]) => {
      // Only track rows that are NOT already selected
      const newRows = rows.filter((r) => !alreadySelectedIds.includes(r.id));
      setNewlySelectedRows(newRows);
    },
    [alreadySelectedIds]
  );

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const newIds = newlySelectedRows.map((r) => r.id);
    onSelect(newIds);
    onOpenChange(false);
  }, [newlySelectedRows, onSelect, onOpenChange]);

  // ─── Cancel handler ───────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setNewlySelectedRows([]);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Seleccionar Empleados</DialogTitle>
          <DialogDescription>
            Seleccione los empleados que desea asignar al parte diario. Los empleados con el checkbox deshabilitado ya
            fueron asignados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <_EmployeeSelectorDataTable
            data={initialData?.data ?? []}
            totalRows={initialData?.total ?? 0}
            searchParams={tableParams}
            reportDate={reportDate}
            alreadySelectedIds={alreadySelectedIds}
            selectedCustomerId={selectedCustomerId}
            tableId={TABLE_ID}
            onRowSelectionChange={handleRowSelectionChange}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={newlySelectedRows.length === 0}>
            Guardar Seleccion
            {newlySelectedRows.length > 0 && ` (${newlySelectedRows.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
