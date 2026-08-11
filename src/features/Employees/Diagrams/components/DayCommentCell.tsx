'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { DiagramFormValues } from '@/features/Employees/Diagrams/schemas/diagram-form-schema';
import { useWatch, type Control } from 'react-hook-form';

interface DayCommentCellProps {
  /** Control del formulario: la celda lee el comentario general por su cuenta. */
  control: Control<DiagramFormValues>;
  /** Fecha del dia en formato DD/MM/YYYY. Se usa para el nombre accesible del campo. */
  dateLabel: string;
  /** Comentario propio del dia. `undefined` significa que el dia hereda el general. */
  value?: string;
  onChange: (value: string) => void;
  onResetToGeneral: () => void;
}

/**
 * Celda de comentario por dia.
 *
 * Mientras el dia no tiene texto propio muestra el comentario general (y lo sigue
 * reflejando si el usuario lo edita arriba). Apenas se escribe algo, el dia queda
 * personalizado y aparece la accion para volver al comentario general.
 *
 * El comentario general se lee con `useWatch` desde aca y no desde el formulario padre:
 * asi tipear en el campo general solo re-renderiza estas celdas (y nada cuando la
 * personalizacion esta apagada, porque no estan montadas).
 */
export function DayCommentCell({ control, dateLabel, value, onChange, onResetToGeneral }: DayCommentCellProps) {
  const generalComment = useWatch({ control, name: 'comments' }) ?? '';
  const isCustom = value !== undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Textarea
        value={value ?? generalComment}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Comentario del ${dateLabel}`}
        placeholder="Sin comentario"
        className="min-h-9 w-full min-w-36 resize-y py-1.5 text-sm"
      />
      {isCustom ? (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="text-muted-foreground h-auto self-start p-0 text-xs"
          onClick={onResetToGeneral}
        >
          Usar el comentario general
        </Button>
      ) : (
        <span className="text-muted-foreground text-xs">Usa el comentario general</span>
      )}
    </div>
  );
}
