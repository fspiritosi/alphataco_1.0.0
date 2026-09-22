'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dailyReportTypeServiceLabels } from '@/shared/utils/mappers';
import { AlertTriangle, ArrowLeft, Calendar as CalendarIcon, Copy } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import type { CloneConflictRow, CloneConflictsByDate } from '../clone.server';

moment.locale('es');

interface Props {
  conflicts: CloneConflictsByDate;
  isCloning: boolean;
  onBack: () => void;
  onSkipAndClone: () => void;
  onCloneAnyway: () => void;
}

export function CloneRowsConflictView({ conflicts, isCloning, onBack, onSkipAndClone, onCloneAnyway }: Props) {
  const sortedDates = Object.keys(conflicts.conflicts).sort();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-start gap-3 rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Ya clonaste estos registros antes</p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Encontramos <span className="font-semibold">{conflicts.totalCount}</span>{' '}
            {conflicts.totalCount === 1 ? 'registro ya clonado' : 'registros ya clonados'} desde tu selección a las
            fechas destino. Revisalos antes de continuar.
          </p>
        </div>
      </div>

      <div className="-mr-2 max-h-[40vh] min-w-0 overflow-y-auto pr-2">
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const items = conflicts.conflicts[dateKey];
            const formattedDate = moment(dateKey).format('dddd D [de] MMMM, YYYY');
            return (
              <section key={dateKey} className="min-w-0 space-y-2">
                <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <h4 className="truncate text-sm font-medium capitalize">{formattedDate}</h4>
                  <Badge variant="secondary" className="ml-1 shrink-0 px-1.5 py-0 text-[10px] font-medium">
                    {items.length} {items.length === 1 ? 'duplicado' : 'duplicados'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <ConflictCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse flex-wrap gap-2 border-t pt-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onBack} disabled={isCloning}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          Volver a la selección
        </Button>
        <Button variant="outline" onClick={onSkipAndClone} disabled={isCloning}>
          Excluir duplicados y clonar el resto
        </Button>
        <Button onClick={onCloneAnyway} disabled={isCloning}>
          {isCloning ? 'Clonando...' : 'Clonar igualmente'}
        </Button>
      </div>
    </div>
  );
}

function ConflictCard({ item }: { item: CloneConflictRow }) {
  const lineParts = [item.customerName, item.serviceName, item.itemName].filter(Boolean).join(' · ');
  const meta = [
    item.sectorName,
    item.areaName,
    item.workingDay,
    item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : null,
    item.typeService ? dailyReportTypeServiceLabels[item.typeService] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const clonedAtText = item.clonedAt ? moment(item.clonedAt).format('DD/MM HH:mm') : null;

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-muted/30 p-2.5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={cn('truncate text-sm font-medium', !lineParts && 'italic text-muted-foreground')}>
            {lineParts || 'Sin información de cliente/servicio'}
          </p>
          {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
          {item.description && <p className="line-clamp-1 text-xs italic text-muted-foreground">{item.description}</p>}
        </div>
        {clonedAtText && (
          <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
            <Copy className="size-3" />
            <span>Clonada {clonedAtText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
