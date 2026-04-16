'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PencilLine, Plus, X } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';

export type ManualItem = {
  /** ID local (no persistido, solo para React key/remove) */
  localId: string;
  label: string;
};

type ManualItemsInputProps = {
  items: ManualItem[];
  onChange: (next: ManualItem[]) => void;
  disabled?: boolean;
};

export const ManualItemsInput = memo(function ManualItemsInput({
  items,
  onChange,
  disabled = false,
}: ManualItemsInputProps) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canAdd = draft.trim().length > 0 && !disabled;

  const handleAdd = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    const newItem: ManualItem = {
      localId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      label: trimmed,
    };
    onChange([...items, newItem]);
    setDraft('');
    textareaRef.current?.focus();
  }, [draft, disabled, items, onChange]);

  const handleRemove = useCallback(
    (localId: string) => {
      if (disabled) return;
      onChange(items.filter((it) => it.localId !== localId));
    },
    [disabled, items, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter → agregar. Enter solo = nueva línea.
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Otros ítems (no listados en el checklist)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 flex flex-col gap-3">
        {items.length > 0 && (
          <ul role="list" className="flex flex-col divide-y rounded-md border">
            {items.map((item) => (
              <li
                key={item.localId}
                role="listitem"
                className={cn(
                  'flex items-start gap-3 py-2.5 px-3 transition-colors',
                  !disabled && 'hover:bg-accent/30'
                )}
              >
                <PencilLine className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="flex-1 text-sm whitespace-pre-wrap break-words">{item.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.localId)}
                  disabled={disabled}
                  aria-label="Quitar ítem manual"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                    'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                    'transition-colors'
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describí el problema..."
            rows={2}
            disabled={disabled}
            aria-label="Describir ítem manual"
            className="field-sizing-content resize-none min-h-[4rem] max-h-[12rem]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full sm:w-auto sm:self-end"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
