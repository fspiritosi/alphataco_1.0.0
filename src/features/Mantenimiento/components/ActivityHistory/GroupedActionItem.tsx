'use client';

import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { ChevronDown, ChevronRight, Settings, User } from 'lucide-react';
import { useState } from 'react';

type GroupedMetadata = Partial<{
  adds: Array<{ description: string; repairTypeIds: string[] }>;
  deletes: string[];
  sectorAssignments: Array<{ itemIds: string[]; sectorId: string; sequenceOrder: number | null }>;
  repairTypeUpdates: Array<{ itemId: string; repairTypeIds: string[] }>;
  sequenceUpdates: Array<{ itemId: string; sequenceOrder: number }>;
  descriptionUpdates: Array<{ itemId: string; description: string }>;
  chiefCommentUpdates: Array<{ itemId: string; comment: string }>;
  workshopAssignments: Array<{ itemIds: string[]; workshopId: string }>;
  rejections: Array<{ itemId: string; reason: string }>;
  restorations: string[];
  source: string;
}>;

interface GroupedActionItemProps {
  performedAt: string | Date;
  performerName: string | null;
  metadata: GroupedMetadata | null;
  isLast: boolean;
}

const SECTION_LABELS: Record<keyof GroupedMetadata, string> = {
  adds: 'items agregados',
  deletes: 'items eliminados',
  sectorAssignments: 'sectores asignados',
  repairTypeUpdates: 'tipos de reparación actualizados',
  sequenceUpdates: 'secuencias actualizadas',
  descriptionUpdates: 'descripciones editadas',
  chiefCommentUpdates: 'comentarios del jefe agregados',
  workshopAssignments: 'asignaciones a taller externo',
  rejections: 'items rechazados',
  restorations: 'items restaurados',
  source: 'fuente',
};

export function GroupedActionItem({ performedAt, performerName, metadata, isLast }: GroupedActionItemProps) {
  const [open, setOpen] = useState(false);
  const meta = metadata ?? {};

  const summary = (Object.entries(meta) as Array<[keyof GroupedMetadata, unknown]>)
    .filter(([key, value]) => key !== 'source' && Array.isArray(value) && value.length > 0)
    .map(([key, value]) => `${(value as unknown[]).length} ${SECTION_LABELS[key]}`)
    .join(', ');

  return (
    <div className="relative flex items-start gap-3 pl-1">
      {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}
      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-slate-50 border-slate-600">
        <Settings className="h-4 w-4 text-slate-600" />
      </div>

      <div className="flex-1 pt-0.5 pb-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-left hover:underline"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm">Gestión de items actualizada</span>
          <Badge variant="outline" className="text-xs ml-1">
            {summary || 'sin cambios'}
          </Badge>
        </button>

        {performerName && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" />
            {performerName}
          </p>
        )}

        {open && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground border-l-2 border-muted pl-3">
            {meta.adds && meta.adds.length > 0 && (
              <div>
                <span className="font-medium">Agregados ({meta.adds.length}):</span>
                <ul className="list-disc pl-4">
                  {meta.adds.map((a, i) => (
                    <li key={i}>{a.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {meta.deletes && meta.deletes.length > 0 && (
              <p>
                <span className="font-medium">Eliminados:</span> {meta.deletes.length} item(s)
              </p>
            )}
            {meta.sectorAssignments && meta.sectorAssignments.length > 0 && (
              <p>
                <span className="font-medium">Sectores asignados:</span> {meta.sectorAssignments.length}
              </p>
            )}
            {meta.repairTypeUpdates && meta.repairTypeUpdates.length > 0 && (
              <p>
                <span className="font-medium">Tipos de reparación cambiados:</span> {meta.repairTypeUpdates.length}
              </p>
            )}
            {meta.sequenceUpdates && meta.sequenceUpdates.length > 0 && (
              <p>
                <span className="font-medium">Secuencias actualizadas:</span> {meta.sequenceUpdates.length}
              </p>
            )}
            {/* Ticket 649: el texto ya viaja en el metadata; antes solo se contaba
                y el comentario quedaba invisible en el historial. */}
            {meta.descriptionUpdates && meta.descriptionUpdates.length > 0 && (
              <div>
                <span className="font-medium">Descripciones editadas ({meta.descriptionUpdates.length}):</span>
                <ul className="list-disc pl-4">
                  {meta.descriptionUpdates.map((d, i) => (
                    <li key={i}>{d.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {meta.chiefCommentUpdates && meta.chiefCommentUpdates.length > 0 && (
              <div>
                <span className="font-medium">Comentarios del jefe ({meta.chiefCommentUpdates.length}):</span>
                <ul className="list-disc pl-4">
                  {meta.chiefCommentUpdates.map((c, i) => (
                    <li key={i} className="whitespace-pre-wrap">
                      {c.comment}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {meta.workshopAssignments && meta.workshopAssignments.length > 0 && (
              <p>
                <span className="font-medium">Asignaciones a taller externo:</span> {meta.workshopAssignments.length}
              </p>
            )}
            {meta.rejections && meta.rejections.length > 0 && (
              <div>
                <span className="font-medium">Rechazados ({meta.rejections.length}):</span>
                <ul className="list-disc pl-4">
                  {meta.rejections.map((r, i) => (
                    <li key={i}>{r.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {meta.restorations && meta.restorations.length > 0 && (
              <p>
                <span className="font-medium">Restaurados:</span> {meta.restorations.length} item(s)
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(performedAt)}</p>
      </div>
    </div>
  );
}
