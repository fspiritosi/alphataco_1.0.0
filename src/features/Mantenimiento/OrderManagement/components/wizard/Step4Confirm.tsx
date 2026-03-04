'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ClipboardList } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import type { WorkshopSector } from '../../actions/actionsServer';
import type { LocalItem } from '../ManageOrderWizard';
import type { SectorOrderEntry } from './Step3ExecutionOrder';

interface Step4ConfirmProps {
  localItems: LocalItem[];
  sectors: WorkshopSector[];
  sectorAssignments: Map<string, string>;
  sectorOrder: SectorOrderEntry[];
  repairTypes: Array<{ id: string; name: string }>;
  plannedStartDate: string;
  plannedEndDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

interface SectorPreview {
  sectorId: string;
  sectorName: string;
  sequenceOrder: number;
  items: LocalItem[];
  repairTypeNames: string[];
}

export function Step4Confirm({
  localItems,
  sectors,
  sectorAssignments,
  sectorOrder,
  repairTypes,
  plannedStartDate,
  plannedEndDate,
  onStartDateChange,
  onEndDateChange,
}: Step4ConfirmProps) {
  const regularItems = useMemo(
    () => localItems.filter((item) => !item.is_diagnostico && !item._deleted && !item.work_order_id),
    [localItems]
  );

  // Build sector previews (grouped items)
  const sectorPreviews: SectorPreview[] = useMemo(() => {
    const sortedSectors = [...sectorOrder].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    return sortedSectors.map((entry) => {
      const sectorItems = regularItems.filter((item) => {
        const assignedSector = sectorAssignments.get(item.id) || item.assigned_sector_id;
        return assignedSector === entry.sectorId;
      });

      // Collect all repair type names for this sector
      const repairTypeNameSet = new Set<string>();
      for (const item of sectorItems) {
        const rtNames = getItemRepairTypeNames(item, repairTypes);
        rtNames.forEach((name) => repairTypeNameSet.add(name));
      }

      return {
        sectorId: entry.sectorId,
        sectorName: entry.sectorName,
        sequenceOrder: entry.sequenceOrder,
        items: sectorItems,
        repairTypeNames: Array.from(repairTypeNameSet),
      };
    });
  }, [regularItems, sectorAssignments, sectorOrder, repairTypes]);

  const totalOTs = sectorPreviews.length;
  const dateError = moment(plannedEndDate).isBefore(moment(plannedStartDate));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-medium">Confirmar Generacion</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Se generaran {totalOTs} ordenes de trabajo, una por cada sector asignado.
        </p>
      </div>

      {/* OT previews */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Ordenes a generar ({totalOTs})</span>
        </div>
        {sectorPreviews.map((preview, index) => (
          <div key={preview.sectorId} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {index + 1}
                </div>
                <Badge variant="default">{preview.sectorName}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{preview.items.length} items + DIAGNOSTICO</span>
            </div>

            {/* Items in this OT */}
            <div className="pl-8 space-y-1">
              {/* DIAGNOSTICO auto-created */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 text-violet-600">
                  DIAGNOSTICO
                </Badge>
                <span>Diagnostico del sector</span>
              </div>
              {/* Regular items */}
              {preview.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getItemRepairTypeNames(item, repairTypes).map((name, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {name}
                    </Badge>
                  ))}
                  <span className="truncate">{String(item.description || 'Sin descripcion')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Planned dates */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Fechas planificadas</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Fecha inicio</Label>
            <Input type="date" value={plannedStartDate} onChange={(e) => onStartDateChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Fecha fin</Label>
            <Input type="date" value={plannedEndDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
        </div>
        {dateError && <p className="text-xs text-destructive">La fecha de fin debe ser posterior a la de inicio.</p>}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function getItemRepairTypeNames(item: LocalItem, repairTypes: Array<{ id: string; name: string }>): string[] {
  if (item._isTemp && item._tempRepairTypeIds) {
    return item._tempRepairTypeIds
      .map((id) => repairTypes.find((rt) => rt.id === id)?.name)
      .filter((name): name is string => !!name);
  }

  const pivotTypes = item.maintenance_order_item_repair_types || [];
  if (pivotTypes.length > 0) {
    return pivotTypes.map((rt) => rt.types_of_repairs?.name).filter((name): name is string => !!name);
  }

  if (item.types_of_repairs?.name) {
    return [String(item.types_of_repairs.name)];
  }

  return [];
}
