'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClipboardX } from 'lucide-react';
import { useState } from 'react';

interface Props {
  /** Equipos que nunca tuvieron un checklist cargado. */
  historicalCount: number;
  /** Equipos sin ningun checklist dentro del mes en curso. */
  monthCount: number;
}

/**
 * Tarjeta KPI con switch (ticket 685): alterna entre "equipos sin checklist
 * este mes" y "equipos sin checklist historico" sin ocupar dos tarjetas.
 */
export function ChecklistMissingCard({ historicalCount, monthCount }: Props) {
  const [showHistorical, setShowHistorical] = useState(false);
  const value = showHistorical ? historicalCount : monthCount;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-lg p-2.5 text-[var(--chart-4)] bg-[var(--chart-4)]/10">
          <ClipboardX className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('es-AR')}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">
              equipos sin checklist ({showHistorical ? 'histórico' : 'este mes'})
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Label
                    htmlFor="checklist-missing-switch"
                    className="cursor-pointer text-[10px] text-muted-foreground"
                  >
                    {showHistorical ? 'Histórico' : 'Mes'}
                  </Label>
                  <Switch
                    id="checklist-missing-switch"
                    checked={showHistorical}
                    onCheckedChange={setShowHistorical}
                    className="scale-75"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {showHistorical
                    ? 'Equipos a los que nunca se les cargó un checklist'
                    : 'Equipos sin ningún checklist dentro del mes en curso'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
