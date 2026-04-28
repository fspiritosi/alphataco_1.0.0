'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

export type PickableItem = {
  id: string;
  code: string;
  label: string;
  is_critical: boolean;
};

export type PickableSection = {
  id: string;
  code: string;
  name: string;
  order_index: number | null;
  items: PickableItem[];
};

export type SelectedItem = {
  templateItemId: string;
  itemCode: string;
  itemLabel: string;
  sectionCode: string;
  isCritical: boolean;
  comment?: string;
};

type ChecklistItemPickerProps = {
  sections: PickableSection[];
  selectedItems: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  disabled?: boolean;
};

export const ChecklistItemPicker = memo(function ChecklistItemPicker({
  sections,
  selectedItems,
  onChange,
  disabled = false,
}: ChecklistItemPickerProps) {
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [sections]
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    sortedSections[0] ? { [sortedSections[0].id]: true } : {}
  );

  const selectedIdSet = useMemo(() => new Set(selectedItems.map((s) => s.templateItemId)), [selectedItems]);

  const handleToggleItem = useCallback(
    (item: PickableItem, sectionCode: string) => {
      if (disabled) return;
      const isSelected = selectedIdSet.has(item.id);
      if (isSelected) {
        onChange(selectedItems.filter((s) => s.templateItemId !== item.id));
      } else {
        onChange([
          ...selectedItems,
          {
            templateItemId: item.id,
            itemCode: item.code,
            itemLabel: item.label,
            sectionCode,
            isCritical: item.is_critical,
            comment: '',
          },
        ]);
      }
    },
    [disabled, onChange, selectedIdSet, selectedItems]
  );

  const handleUpdateComment = useCallback(
    (templateItemId: string, comment: string) => {
      onChange(selectedItems.map((s) => (s.templateItemId === templateItemId ? { ...s, comment } : s)));
    },
    [onChange, selectedItems]
  );

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  if (sortedSections.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay ítems disponibles en el checklist.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedSections.map((section) => {
        const sortedItems = [...section.items];
        const selectedCountInSection = sortedItems.filter((i) => selectedIdSet.has(i.id)).length;
        const isOpen = openSections[section.id] ?? false;

        return (
          <Card key={section.id} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                      />
                      <span className="font-medium">{section.name}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedCountInSection}/{sortedItems.length}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="flex flex-col divide-y">
                    {sortedItems.map((item) => {
                      const isSelected = selectedIdSet.has(item.id);
                      const selected = selectedItems.find((s) => s.templateItemId === item.id);
                      return (
                        <div
                          key={item.id}
                          className={cn('flex flex-col gap-2 py-2.5 transition-colors', isSelected && 'bg-accent/20')}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleToggleItem(item, section.code)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                handleToggleItem(item, section.code);
                              }
                            }}
                            className={cn(
                              'flex items-center gap-3 rounded-sm px-1 cursor-pointer',
                              disabled && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={disabled}
                              onCheckedChange={() => handleToggleItem(item, section.code)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Seleccionar ${item.label}`}
                            />
                            <span className="flex-1 text-sm">{item.label}</span>
                            {item.is_critical && (
                              <Badge variant="destructive" className="gap-1 text-[10px] uppercase tracking-wider">
                                <AlertCircle className="h-3 w-3" />
                                Crítico
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <Textarea
                              value={selected?.comment ?? ''}
                              onChange={(e) => handleUpdateComment(item.id, e.target.value)}
                              placeholder="Comentario (opcional)"
                              rows={2}
                              disabled={disabled}
                              className="ml-8 text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
});
