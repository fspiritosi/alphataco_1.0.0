'use client';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface TaskNotesProps {
  repairId: string;
  initialNotes: string;
  savedNotes: string;
  placeholder?: string;
  disabled?: boolean;
  onNotesChange: (repairId: string, notes: string) => void;
  onNotesSave: (repairId: string, notes: string) => void;
}

export function TaskNotes({
  repairId,
  initialNotes,
  savedNotes,
  placeholder = 'Agregar notas tecnicas...',
  disabled = false,
  onNotesChange,
  onNotesSave,
}: TaskNotesProps) {
  const hasNotes = !!initialNotes.trim();
  const [isOpen, setIsOpen] = useState(hasNotes);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          type="button"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {hasNotes ? 'Ver notas' : 'Agregar notas'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <Textarea
          placeholder={placeholder}
          value={initialNotes}
          onChange={(e) => onNotesChange(repairId, e.target.value)}
          onBlur={(e) => {
            if (e.target.value !== savedNotes) {
              onNotesSave(repairId, e.target.value);
            }
          }}
          rows={2}
          disabled={disabled}
          className="text-sm resize-none"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
