'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Stethoscope } from 'lucide-react';

interface DiagnosticoCardProps {
  repairId: string;
  isCompleted: boolean;
  notes: string;
  isMutating: boolean;
  onToggle: (repairId: string, isCompleted: boolean) => void;
  onNotesChange: (repairId: string, notes: string) => void;
  onNotesSave: (repairId: string, notes: string) => void;
  savedNotes: string;
}

export function DiagnosticoCard({
  repairId,
  isCompleted,
  notes,
  isMutating,
  onToggle,
  onNotesChange,
  onNotesSave,
  savedNotes,
}: DiagnosticoCardProps) {
  return (
    <Card
      className={`border-2 transition-colors ${
        isCompleted
          ? 'border-green-400/60 bg-green-50/40 dark:bg-green-950/20'
          : 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`diag-${repairId}`}
            checked={isCompleted}
            onCheckedChange={() => onToggle(repairId, isCompleted)}
            disabled={isMutating}
            className="mt-1 h-5 w-5 sm:h-6 sm:w-6"
          />
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title */}
            <div className="flex items-center gap-2 flex-wrap">
              <label
                htmlFor={`diag-${repairId}`}
                className={`text-base font-semibold cursor-pointer flex items-center gap-2 ${
                  isCompleted ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Stethoscope className="h-5 w-5 text-amber-600 flex-shrink-0" />
                )}
                DIAGNOSTICO
              </label>
              <Badge variant={isCompleted ? 'success' : 'warning'} className="text-xs">
                {isCompleted ? 'Completado' : 'Obligatorio'}
              </Badge>
            </div>

            {/* Notes - always visible for diagnostico */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notas del diagnostico:</label>
              <Textarea
                placeholder="Describir el diagnostico realizado..."
                value={notes}
                onChange={(e) => onNotesChange(repairId, e.target.value)}
                onBlur={(e) => {
                  if (e.target.value !== savedNotes) {
                    onNotesSave(repairId, e.target.value);
                  }
                }}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
