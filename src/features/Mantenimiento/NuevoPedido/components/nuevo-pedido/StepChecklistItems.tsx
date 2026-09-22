'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { isNonPropagatingChecklistItem } from '@/features/Mantenimiento/constants/non-propagating-checklist-items';
import { ManualItemsInput, type ManualItem } from '@/features/Mantenimiento/shared/components/ManualItemsInput';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info } from 'lucide-react';
import type { ChecklistTemplateForEquipment } from '../../actions/queries.server';
import type { SelectedDeviation } from './types';

export interface StepChecklistItemsProps {
  deviationComments: Record<string, string>;
  handleToggleDeviation: (
    item: { id: string; code: string; label: string; is_critical: boolean | null },
    sectionCode: string
  ) => void;
  handleUpdateComment: (itemId: string, comment: string) => void;
  isSubmitting: boolean;
  manualItems: ManualItem[];
  selectedDeviations: SelectedDeviation[];
  selectedTemplate: ChecklistTemplateForEquipment | undefined;
  selectedTemplateId: string;
  setManualItems: (items: ManualItem[]) => void;
}

/** Paso "Items": desvíos del checklist elegido más los ítems cargados a mano. */
export function StepChecklistItems({
  deviationComments,
  handleToggleDeviation,
  handleUpdateComment,
  isSubmitting,
  manualItems,
  selectedDeviations,
  selectedTemplate,
  selectedTemplateId,
  setManualItems,
}: StepChecklistItemsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Selecciona los items con desvío</Label>
        <Badge variant="secondary">{selectedDeviations.length} seleccionados</Badge>
      </div>

      {selectedTemplate?.checklist_template_sections ? (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {selectedTemplate.checklist_template_sections
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map((section) => (
                <Card key={section.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {section.name}
                      <Badge variant="outline" className="text-xs">
                        {section.checklist_template_items?.length || 0} items
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {section.checklist_template_items
                      ?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                      .map((item) => {
                        const isSelected = selectedDeviations.some((d) => d.itemId === item.id);
                        const isNonPropagating = isNonPropagatingChecklistItem(selectedTemplateId, item.code);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'p-2 rounded-lg border transition-all',
                              isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted'
                            )}
                          >
                            <div
                              className="flex items-start gap-2 cursor-pointer"
                              onClick={() =>
                                handleToggleDeviation(
                                  { id: item.id, code: item.code, label: item.label, is_critical: item.is_critical },
                                  section.code
                                )
                              }
                            >
                              <Checkbox checked={isSelected} className="mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm">{item.label}</span>
                                  {item.is_critical && (
                                    <Badge variant="destructive" className="text-xs">
                                      Crítico
                                    </Badge>
                                  )}
                                  {isNonPropagating && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] gap-1 border-dashed font-normal"
                                      title="Si marcás este desvío, queda registrado pero no genera trabajo en taller."
                                    >
                                      <Info className="h-3 w-3" />
                                      Solo informativo · No viaja a taller
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{item.code}</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2 ml-6">
                                <Textarea
                                  placeholder="Comentario sobre el desvío (opcional)"
                                  value={deviationComments[item.id] || ''}
                                  onChange={(e) => handleUpdateComment(item.id, e.target.value)}
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="p-4 bg-muted text-center rounded-lg">No hay items en este checklist</div>
      )}

      <ManualItemsInput items={manualItems} onChange={setManualItems} disabled={isSubmitting} />
    </div>
  );
}
