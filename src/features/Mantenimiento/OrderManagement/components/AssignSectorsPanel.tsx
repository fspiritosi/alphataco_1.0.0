'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/features/Mantenimiento/shared/components/SearchableSelect';
import { Building2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ExternalWorkshop, OrderManagementItem, WorkshopSector } from '../actions/actionsServer';

type OrderItem = OrderManagementItem['maintenance_order_items'][number];

interface SectorAssignment {
  sectorId: string;
  sectorName: string;
  sequenceOrder: number;
  itemIds: string[];
}

interface WorkshopAssignment {
  workshopId: string;
  workshopName: string;
  itemIds: string[];
}

interface AssignSectorsPanelProps {
  items: OrderItem[];
  sectors: WorkshopSector[];
  externalWorkshops: ExternalWorkshop[];
  onAssign: (assignments: SectorAssignment[]) => void;
  onAssignExternalWorkshop: (assignments: WorkshopAssignment[]) => void;
}

export function AssignSectorsPanel({
  items,
  sectors,
  externalWorkshops,
  onAssign,
  onAssignExternalWorkshop,
}: AssignSectorsPanelProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [assignments, setAssignments] = useState<SectorAssignment[]>([]);
  const [workshopAssignments, setWorkshopAssignments] = useState<WorkshopAssignment[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'internal' | 'external'>('internal');

  // Opciones de los combobox con buscador (sectores y talleres externos)
  const sectorOptions = useMemo(() => sectors.map((sector) => ({ value: sector.id, label: sector.name })), [sectors]);

  const externalWorkshopOptions = useMemo(
    () =>
      externalWorkshops.map((ws) => ({
        value: ws.id,
        // El proveedor va en el label porque distingue talleres de nombre parecido
        label: ws.provider_name ? `${ws.name} (${ws.provider_name})` : ws.name,
        keywords: ws.provider_name ?? '',
      })),
    [externalWorkshops]
  );

  // Items sin asignar sector (filtrar diagnostico y ya asignados)
  const unassignedItems = useMemo(() => {
    const assignedInPendingIds = new Set([
      ...assignments.flatMap((a) => a.itemIds),
      ...workshopAssignments.flatMap((a) => a.itemIds),
    ]);
    return items.filter(
      (item) =>
        !item.assigned_sector_id &&
        !item.assigned_workshop_id &&
        !item.is_diagnostico &&
        !assignedInPendingIds.has(item.id)
    );
  }, [items, assignments, workshopAssignments]);

  // Items ya asignados a sectores
  const assignedItems = useMemo(() => {
    return items.filter((item) => (item.assigned_sector_id || item.assigned_workshop_id) && !item.is_diagnostico);
  }, [items]);

  // Calcular el siguiente sequence order basado en items ya asignados al sector seleccionado
  const nextSequenceOrder = useMemo(() => {
    if (!selectedSectorId) return 1;
    const itemsInSector = items.filter((i) => i.assigned_sector_id === selectedSectorId);
    const pendingInSector = assignments.filter((a) => a.sectorId === selectedSectorId);
    const maxExisting = Math.max(0, ...itemsInSector.map((i) => i.sector_sequence_order || 0));
    const maxPending = Math.max(0, ...pendingInSector.map((a) => a.sequenceOrder));
    return Math.max(maxExisting, maxPending) + 1;
  }, [selectedSectorId, items, assignments]);

  const [sequenceOrder, setSequenceOrder] = useState(1);

  // Sync sequence order when sector changes
  const handleSectorChange = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    const itemsInSector = items.filter((i) => i.assigned_sector_id === sectorId);
    const pendingInSector = assignments.filter((a) => a.sectorId === sectorId);
    const maxExisting = Math.max(0, ...itemsInSector.map((i) => i.sector_sequence_order || 0));
    const maxPending = Math.max(0, ...pendingInSector.map((a) => a.sequenceOrder));
    setSequenceOrder(Math.max(maxExisting, maxPending) + 1);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleAddAssignment = () => {
    if (selectedItemIds.size === 0) {
      toast.error('Selecciona al menos un item');
      return;
    }

    if (assignmentMode === 'internal') {
      if (!selectedSectorId) {
        toast.error('Selecciona un sector');
        return;
      }

      const sector = sectors.find((s) => s.id === selectedSectorId);
      if (!sector) return;

      const newAssignment: SectorAssignment = {
        sectorId: selectedSectorId,
        sectorName: sector.name,
        sequenceOrder,
        itemIds: Array.from(selectedItemIds),
      };

      setAssignments((prev) => [...prev, newAssignment]);
    } else {
      if (!selectedWorkshopId) {
        toast.error('Selecciona un taller externo');
        return;
      }

      const workshop = externalWorkshops.find((w) => w.id === selectedWorkshopId);
      if (!workshop) return;

      const newAssignment: WorkshopAssignment = {
        workshopId: selectedWorkshopId,
        workshopName: workshop.name,
        itemIds: Array.from(selectedItemIds),
      };

      setWorkshopAssignments((prev) => [...prev, newAssignment]);
    }

    setSelectedItemIds(new Set());
    setSelectedSectorId('');
    setSelectedWorkshopId('');
    setSequenceOrder(1);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveWorkshopAssignment = (index: number) => {
    setWorkshopAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (assignments.length === 0 && workshopAssignments.length === 0) {
      toast.error('No hay asignaciones pendientes');
      return;
    }

    if (assignments.length > 0) {
      onAssign(assignments);
    }
    if (workshopAssignments.length > 0) {
      onAssignExternalWorkshop(workshopAssignments);
    }
    setAssignments([]);
    setWorkshopAssignments([]);
  };

  const getItemLabel = (item: OrderItem) => {
    if (item.is_diagnostico) return 'DIAGNOSTICO';
    const repairName = item.types_of_repairs?.name;
    const desc = item.description;
    if (repairName && desc) return `${repairName} - ${desc}`;
    return repairName || desc || 'Item sin descripcion';
  };

  return (
    <div className="space-y-6">
      {/* Items ya asignados */}
      {assignedItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Items ya asignados</h4>
          <div className="space-y-1">
            {assignedItems.map((item) => {
              const isExternal = !item.assigned_sector_id && !!item.assigned_workshop_id;
              return (
                <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isExternal ? (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Building2 className="h-3 w-3" />
                      Externo
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {item.workshop_sectors && 'name' in item.workshop_sectors
                          ? String(item.workshop_sectors.name)
                          : 'Sector'}
                      </Badge>
                      <span>Orden {String(item.sector_sequence_order ?? '-')}</span>
                    </>
                  )}
                  <span>-</span>
                  <span>{getItemLabel(item)}</span>
                </div>
              );
            })}
          </div>
          <Separator className="mt-3" />
        </div>
      )}

      {/* Seleccion de items sin asignar */}
      {unassignedItems.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium mb-2">Items sin asignar ({unassignedItems.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
            {unassignedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Checkbox checked={selectedItemIds.has(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                <span className="text-sm flex-1">{getItemLabel(item)}</span>
                {item.types_of_repairs?.autorizable && (
                  <Badge variant="warning" className="text-xs">
                    Autorizable
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Mode toggle: Internal / External */}
          {externalWorkshops.length > 0 && (
            <Tabs
              value={assignmentMode}
              onValueChange={(v) => setAssignmentMode(v as 'internal' | 'external')}
              className="mt-3"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="internal">Sector Interno</TabsTrigger>
                <TabsTrigger value="external">Taller Externo</TabsTrigger>
              </TabsList>

              <TabsContent value="internal" className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Sector</Label>
                    {/* Buscador integrado: la lista de sectores del taller es larga */}
                    <SearchableSelect
                      value={selectedSectorId}
                      onValueChange={handleSectorChange}
                      options={sectorOptions}
                      placeholder="Seleccionar sector"
                      searchPlaceholder="Buscar sector..."
                      emptyMessage="No se encontro el sector"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Orden de secuencia</Label>
                    <Input
                      type="number"
                      min={1}
                      value={sequenceOrder}
                      onChange={(e) => setSequenceOrder(Number(e.target.value))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="external" className="mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Taller Externo</Label>
                  <SearchableSelect
                    value={selectedWorkshopId}
                    onValueChange={setSelectedWorkshopId}
                    options={externalWorkshopOptions}
                    placeholder="Seleccionar taller externo"
                    searchPlaceholder="Buscar taller o proveedor..."
                    emptyMessage="No se encontro el taller"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Fallback: no external workshops */}
          {externalWorkshops.length === 0 && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <Label className="text-xs">Sector</Label>
                <SearchableSelect
                  value={selectedSectorId}
                  onValueChange={handleSectorChange}
                  options={sectorOptions}
                  placeholder="Seleccionar sector"
                  searchPlaceholder="Buscar sector..."
                  emptyMessage="No se encontro el sector"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Orden de secuencia</Label>
                <Input
                  type="number"
                  min={1}
                  value={sequenceOrder}
                  onChange={(e) => setSequenceOrder(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleAddAssignment}
            variant="outline"
            className="mt-3 w-full"
            disabled={
              selectedItemIds.size === 0 || (assignmentMode === 'internal' ? !selectedSectorId : !selectedWorkshopId)
            }
          >
            Agregar asignacion
          </Button>
        </div>
      ) : (
        assignments.length === 0 &&
        workshopAssignments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Todos los items ya estan asignados a sectores
          </p>
        )
      )}

      {/* Preview de asignaciones pendientes */}
      {(assignments.length > 0 || workshopAssignments.length > 0) && (
        <div>
          <h4 className="text-sm font-medium mb-2">Asignaciones pendientes</h4>
          <div className="space-y-2">
            {assignments
              .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
              .map((assignment, index) => (
                <Card key={`sector-${index}`}>
                  <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="default">Orden {assignment.sequenceOrder}</Badge>
                      {assignment.sectorName}
                      <span className="text-muted-foreground font-normal">
                        ({assignment.itemIds.length} items + Diagnostico)
                      </span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveAssignment(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <div className="space-y-1">
                      {assignment.itemIds.map((itemId) => {
                        const item = items.find((i) => i.id === itemId);
                        return (
                          <span key={itemId} className="text-xs text-muted-foreground block">
                            {item ? getItemLabel(item) : itemId}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}

            {workshopAssignments.map((assignment, index) => (
              <Card key={`ws-${index}`} className="border-l-4 border-l-blue-400">
                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      Externo
                    </Badge>
                    {assignment.workshopName}
                    <span className="text-muted-foreground font-normal">({assignment.itemIds.length} items)</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveWorkshopAssignment(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="space-y-1">
                    {assignment.itemIds.map((itemId) => {
                      const item = items.find((i) => i.id === itemId);
                      return (
                        <span key={itemId} className="text-xs text-muted-foreground block">
                          {item ? getItemLabel(item) : itemId}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={handleConfirm} className="mt-4 w-full">
            Confirmar {assignments.length + workshopAssignments.length} asignacion(es)
          </Button>
        </div>
      )}
    </div>
  );
}
