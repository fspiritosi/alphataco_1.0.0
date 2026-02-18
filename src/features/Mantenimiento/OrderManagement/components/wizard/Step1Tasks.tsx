'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { AlertTriangle, MessageSquare, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { OrderManagementItem } from '../../actions/actionsServer';
import type { LocalItem } from '../ManageOrderWizard';

interface Step1TasksProps {
  order: OrderManagementItem;
  localItems: LocalItem[];
  repairTypes: Array<{ id: string; name: string }>;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onEditRepairTypes: (item: LocalItem) => void;
  onDescriptionChange: (itemId: string, description: string) => void;
  onChiefCommentChange: (itemId: string, comment: string) => void;
}

export function Step1Tasks({
  order,
  localItems,
  repairTypes,
  onAddItem,
  onDeleteItem,
  onEditRepairTypes,
  onDescriptionChange,
  onChiefCommentChange,
}: Step1TasksProps) {
  const [editingCommentItemId, setEditingCommentItemId] = useState<string | null>(null);

  const regularItems = localItems.filter((item) => !item.is_diagnostico && !item._deleted);

  // Items sin repair type asignado
  const itemsWithoutRepairType = regularItems.filter((item) => {
    if (item._isTemp && item._tempRepairTypeIds) {
      return item._tempRepairTypeIds.length === 0;
    }
    const pivotTypes = item.maintenance_order_item_repair_types || [];
    return pivotTypes.length === 0 && !item.types_of_repairs;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Items de reparacion ({regularItems.length})</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revise y ajuste los items. Cada item debe tener al menos un tipo de reparacion.
          </p>
        </div>
        <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="create">
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar item
          </Button>
        </PermissionGuard>
      </div>

      {/* Warning: items sin repair type */}
      {itemsWithoutRepairType.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-xs">
            {itemsWithoutRepairType.length} item(s) sin tipo de reparacion asignado. Asigne al menos uno para continuar.
          </span>
        </div>
      )}

      {/* Items list */}
      {regularItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay items en este pedido</p>
      ) : (
        <div className="space-y-2">
          {regularItems.map((item) => {
            let repairTypeNames: string[] = [];
            let hasAutorizable = false;

            if (item._isTemp && item._tempRepairTypeIds) {
              repairTypeNames = item._tempRepairTypeIds
                .map((id) => repairTypes.find((rt) => rt.id === id)?.name)
                .filter((name): name is string => !!name);
            } else {
              const pivotRepairTypes = item.maintenance_order_item_repair_types || [];
              repairTypeNames =
                pivotRepairTypes.length > 0
                  ? pivotRepairTypes.map((rt) => rt.types_of_repairs?.name).filter((name): name is string => !!name)
                  : item.types_of_repairs?.name
                    ? [String(item.types_of_repairs.name)]
                    : [];
              hasAutorizable =
                pivotRepairTypes.some((rt) => rt.types_of_repairs?.autorizable) || !!item.types_of_repairs?.autorizable;
            }

            const deviation = item.maintenance_request_items?.checklist_deviations;
            const canDelete = item._isTemp || !item.maintenance_request_item_id;
            const hasWorkOrder = !!item.work_order_id;
            const isEditingComment = editingCommentItemId === item.id;
            const hasChiefComment = !!item.workshop_chief_comment;

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col p-3 border rounded-lg transition-colors hover:bg-muted/30 ${
                  item._isTemp
                    ? 'border-dashed border-blue-300 bg-blue-50/30 dark:bg-blue-950/20'
                    : hasWorkOrder
                      ? 'border-l-4 border-l-emerald-500'
                      : repairTypeNames.length === 0
                        ? 'border-l-4 border-l-amber-400'
                        : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Status + Repair type badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item._isTemp && (
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300 px-1.5 py-0">
                          Nuevo
                        </Badge>
                      )}
                      {hasWorkOrder && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          OT generada
                        </Badge>
                      )}
                      {repairTypeNames.length > 0 ? (
                        repairTypeNames.map((name, idx) => (
                          <Badge key={idx} variant="default" className="text-[10px] px-1.5 py-0">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Sin tipo asignado
                        </Badge>
                      )}
                      {hasAutorizable && (
                        <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                          Autorizable
                        </Badge>
                      )}
                    </div>
                    {/* Description - READ ONLY */}
                    {item.description && <p className="text-sm text-foreground">{String(item.description)}</p>}
                    {/* Deviation info */}
                    {deviation && (
                      <p className="text-xs text-muted-foreground/80 italic">
                        Desvio: {String(deviation.item_label || deviation.item_code)}
                      </p>
                    )}
                    {/* Comments with attribution */}
                    <ItemComments item={item} source={order.maintenance_requests?.source} />
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {!item._isTemp && !hasWorkOrder && (
                      <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="update">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onEditRepairTypes(item)}
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          Asignar tarea
                        </Button>
                      </PermissionGuard>
                    )}
                    {canDelete && !hasWorkOrder && (
                      <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onDeleteItem(item.id)}
                          title="Eliminar item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </PermissionGuard>
                    )}
                  </div>
                </div>

                {/* Chief comment section */}
                {!hasWorkOrder && (
                  <div className="mt-2">
                    {isEditingComment ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={item.workshop_chief_comment || ''}
                          onChange={(e) => onChiefCommentChange(item.id, e.target.value)}
                          placeholder="Escriba su comentario..."
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setEditingCommentItemId(null)}
                          >
                            Cerrar
                          </Button>
                        </div>
                      </div>
                    ) : hasChiefComment ? (
                      <div className="flex items-start gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-sm">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-emerald-800 dark:text-emerald-200 text-xs">
                            Mi comentario:{' '}
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-300 text-xs italic">
                            {item.workshop_chief_comment}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 text-emerald-600 hover:text-emerald-800"
                          onClick={() => setEditingCommentItemId(item.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingCommentItemId(item.id)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Agregar comentario
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
