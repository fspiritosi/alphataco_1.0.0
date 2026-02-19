'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { getSectorCandidatesForRepairTypes, type WorkshopSector } from '../../actions/actionsServer';
import type { LocalItem } from '../ManageOrderWizard';

const logger = new Logger('Step2SectorAssignment');

interface Step2SectorAssignmentProps {
  localItems: LocalItem[];
  sectors: WorkshopSector[];
  sectorAssignments: Map<string, string>; // itemId → sectorId
  onAssignmentChange: (itemId: string, sectorId: string) => void;
  onBatchAssignment: (assignments: Map<string, string>) => void;
  repairTypes: Array<{ id: string; name: string }>;
}

interface ItemAssignmentInfo {
  item: LocalItem;
  repairTypeIds: string[];
  repairTypeNames: string[];
  candidateSectorIds: string[];
  assignedSectorId: string | null;
  status: 'auto' | 'ambiguous' | 'manual' | 'already_assigned';
}

export function Step2SectorAssignment({
  localItems,
  sectors,
  sectorAssignments,
  onAssignmentChange,
  onBatchAssignment,
  repairTypes,
}: Step2SectorAssignmentProps) {
  const regularItems = useMemo(
    () => localItems.filter((item) => !item.is_diagnostico && !item._deleted && !item.work_order_id),
    [localItems]
  );

  // Collect all unique repair type IDs from all items
  const allRepairTypeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of regularItems) {
      const itemRtIds = getItemRepairTypeIds(item);
      itemRtIds.forEach((id) => ids.add(id));
    }
    return Array.from(ids);
  }, [regularItems]);

  // Query sector_repair_types mapping
  const { data: sectorCandidates, isLoading } = useQuery({
    queryKey: ['sector-candidates', allRepairTypeIds],
    queryFn: () => getSectorCandidatesForRepairTypes(allRepairTypeIds),
    enabled: allRepairTypeIds.length > 0,
    staleTime: 0,
  });

  // Build mapping: repairTypeId → sectorIds[]
  const repairTypeToSectors = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!sectorCandidates) return map;

    for (const candidate of sectorCandidates) {
      const rtId = candidate.repair_type_id;
      const sectorId = candidate.workshop_sector_id;
      if (!map.has(rtId)) {
        map.set(rtId, []);
      }
      map.get(rtId)!.push(sectorId);
    }
    return map;
  }, [sectorCandidates]);

  // Compute assignment info for each item
  const itemAssignments: ItemAssignmentInfo[] = useMemo(() => {
    return regularItems.map((item) => {
      const repairTypeIds = getItemRepairTypeIds(item);
      const repairTypeNames = repairTypeIds
        .map((id) => repairTypes.find((rt) => rt.id === id)?.name)
        .filter((n): n is string => !!n);

      // If item already has sector assigned from DB
      if (item.assigned_sector_id && !item._isTemp) {
        return {
          item,
          repairTypeIds,
          repairTypeNames,
          candidateSectorIds: [item.assigned_sector_id],
          assignedSectorId: sectorAssignments.get(item.id) || item.assigned_sector_id,
          status: 'already_assigned' as const,
        };
      }

      // Find candidate sectors via intersection
      const candidateSectorIds = findCandidateSectors(repairTypeIds, repairTypeToSectors);

      const assignedSectorId = sectorAssignments.get(item.id) || null;

      let status: ItemAssignmentInfo['status'];
      if (candidateSectorIds.length === 1) {
        status = 'auto';
      } else if (candidateSectorIds.length > 1) {
        status = 'ambiguous';
      } else {
        status = 'manual';
      }

      return {
        item,
        repairTypeIds,
        repairTypeNames,
        candidateSectorIds,
        assignedSectorId,
        status,
      };
    });
  }, [regularItems, repairTypeToSectors, sectorAssignments, repairTypes]);

  // Auto-assign items that have exactly 1 candidate sector (on first render only)
  const performAutoAssignment = useCallback(() => {
    const newAssignments = new Map(sectorAssignments);
    let changed = false;

    for (const info of itemAssignments) {
      if (info.status === 'auto' && !sectorAssignments.has(info.item.id)) {
        newAssignments.set(info.item.id, info.candidateSectorIds[0]);
        changed = true;
      }
    }

    if (changed) {
      onBatchAssignment(newAssignments);
    }
  }, [itemAssignments, sectorAssignments, onBatchAssignment]);

  // Run auto-assignment when candidates data loads
  useEffect(() => {
    if (sectorCandidates && !isLoading) {
      performAutoAssignment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorCandidates, isLoading]);

  // Group items by status for display
  const autoAssigned = itemAssignments.filter((i) => i.status === 'auto' || i.status === 'already_assigned');
  const needsManualSelection = itemAssignments.filter((i) => i.status === 'ambiguous' || i.status === 'manual');

  // Count unassigned
  const unassignedCount = itemAssignments.filter((i) => !i.assignedSectorId && i.status !== 'already_assigned').length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-medium">Asignacion de Sectores</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Los items se asignan automaticamente segun los tipos de reparacion configurados en cada sector.
        </p>
      </div>

      {/* Warning for unassigned items */}
      {unassignedCount > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-xs">{unassignedCount} item(s) necesitan asignacion manual de sector.</span>
        </div>
      )}

      {/* Auto-assigned section */}
      {autoAssigned.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">Auto-asignados ({autoAssigned.length})</span>
          </div>
          <div className="space-y-1.5">
            {autoAssigned.map((info) => {
              const sectorId = info.assignedSectorId;
              const sectorName = sectorId ? sectors.find((s) => s.id === sectorId)?.name || 'Desconocido' : '—';

              return (
                <div
                  key={info.item.id}
                  className="flex items-center justify-between p-2.5 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {info.repairTypeNames.map((name, idx) => (
                        <Badge key={idx} variant="default" className="text-[10px] px-1.5 py-0">
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {String(info.item.description || 'Sin descripcion')}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-2 shrink-0 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300"
                  >
                    {sectorName}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {autoAssigned.length > 0 && needsManualSelection.length > 0 && <Separator />}

      {/* Manual selection section */}
      {needsManualSelection.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Requieren seleccion manual ({needsManualSelection.length})</span>
          </div>
          <div className="space-y-2">
            {needsManualSelection.map((info) => {
              const availableSectors =
                info.candidateSectorIds.length > 0
                  ? sectors.filter((s) => info.candidateSectorIds.includes(s.id))
                  : sectors;

              return (
                <div
                  key={info.item.id}
                  className={cn(
                    'p-3 border rounded-lg',
                    info.assignedSectorId
                      ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-950/20'
                      : 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {info.repairTypeNames.length > 0 ? (
                          info.repairTypeNames.map((name, idx) => (
                            <Badge key={idx} variant="default" className="text-[10px] px-1.5 py-0">
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Sin tipo
                          </Badge>
                        )}
                        {info.status === 'ambiguous' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
                            {info.candidateSectorIds.length} sectores posibles
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {String(info.item.description || 'Sin descripcion')}
                      </p>
                    </div>
                    <div className="shrink-0 w-44">
                      <Label className="text-[10px] text-muted-foreground">Sector</Label>
                      <Select
                        value={info.assignedSectorId || ''}
                        onValueChange={(value) => onAssignmentChange(info.item.id, value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSectors.map((sector) => (
                            <SelectItem key={sector.id} value={sector.id}>
                              {sector.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All assigned message */}
      {regularItems.length > 0 && unassignedCount === 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">Todos los items tienen sector asignado.</span>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function getItemRepairTypeIds(item: LocalItem): string[] {
  if (item._isTemp && item._tempRepairTypeIds) {
    return item._tempRepairTypeIds;
  }

  const pivotTypes = item.maintenance_order_item_repair_types || [];
  if (pivotTypes.length > 0) {
    return pivotTypes.map((rt) => rt.repair_type_id).filter(Boolean) as string[];
  }

  if (item.repair_type_id) {
    return [item.repair_type_id];
  }

  return [];
}

/**
 * Finds candidate sectors for an item by intersecting sectors that handle
 * ALL of the item's repair types.
 */
function findCandidateSectors(repairTypeIds: string[], repairTypeToSectors: Map<string, string[]>): string[] {
  if (repairTypeIds.length === 0) return [];

  // Get sector sets for each repair type
  const sectorSets = repairTypeIds
    .map((rtId) => repairTypeToSectors.get(rtId))
    .filter((set): set is string[] => !!set && set.length > 0);

  if (sectorSets.length === 0) return [];

  // If not all repair types have mappings, no guaranteed intersection
  if (sectorSets.length < repairTypeIds.length) return [];

  // Intersect all sets
  let intersection = new Set(sectorSets[0]);
  for (let i = 1; i < sectorSets.length; i++) {
    const currentSet = new Set(sectorSets[i]);
    intersection = new Set([...intersection].filter((id) => currentSet.has(id)));
  }

  return Array.from(intersection);
}
