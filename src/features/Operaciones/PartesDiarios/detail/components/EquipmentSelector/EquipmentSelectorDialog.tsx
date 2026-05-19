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
import _EquipmentSelectorDataTable from './_EquipmentSelectorDataTable';
import { getActiveEquipmentPaginated, type EquipmentSelectorItem } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'equipment-selector';

// ============================================================================
// TYPES
// ============================================================================

export interface EquipmentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** IDs already assigned — these rows will have the checkbox checked + disabled */
  alreadySelectedIds: string[];
  /** If set, equipment not contracted for this customer gets a "No asignado" badge */
  selectedCustomerId: string | null;
  /** Called with the NEW selections (excluding already-selected ones) */
  onSelect: (selectedIds: string[]) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EquipmentSelectorDialog({
  open,
  onOpenChange,
  alreadySelectedIds,
  selectedCustomerId,
  onSelect,
}: EquipmentSelectorDialogProps) {
  // ─── Local state ──────────────────────────────────────────────────────────
  const [searchParams] = useState<DataTableSearchParams>({});
  const [newlySelectedRows, setNewlySelectedRows] = useState<EquipmentSelectorItem[]>([]);

  // Strip prefix from search params before passing to server action
  const tableParams = useMemo(() => stripPrefixFromSearchParams(searchParams, TABLE_ID), [searchParams]);

  // ─── Initial data via React Query ─────────────────────────────────────────
  const { data: initialData } = useQuery({
    queryKey: ['equipment-selector-initial'],
    queryFn: () => getActiveEquipmentPaginated({}),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Row selection handler ────────────────────────────────────────────────
  const handleRowSelectionChange = useCallback(
    (rows: EquipmentSelectorItem[]) => {
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
          <DialogTitle>Seleccionar Equipos</DialogTitle>
          <DialogDescription>
            Seleccione los equipos que desea asignar al parte diario. Los equipos con el checkbox deshabilitado ya
            fueron asignados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <_EquipmentSelectorDataTable
            data={initialData?.data ?? []}
            totalRows={initialData?.total ?? 0}
            searchParams={tableParams}
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
