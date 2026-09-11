'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock,
  Gauge,
  Pause,
  PlayCircle,
  Wrench,
} from 'lucide-react';
import { memo, type ReactNode } from 'react';
import type { WorkshopSectorWithCount } from '../actions.server';

/**
 * Contadores de ÓRDENES DE TRABAJO a mostrar en el header del acordeón.
 *
 * Ticket 678: antes contaban tareas, por eso un camión con cuatro tareas se veía
 * como "4 órdenes de trabajo". Ahora cada número es una OT — o sea, una unidad.
 *
 * Orden = orden visual. Se ocultan los estados con count = 0.
 * NO se muestran: `completed`, `completed_partial`, `cancelled` (finalizados).
 *
 * Los iconos son los mismos que usa `WO_STATUS_CONFIG` en la tabla del sector,
 * para que el mismo estado se lea igual en las dos superficies. El rojo queda
 * reservado para el semáforo de cupos: si "Pendientes" también fuera rojo, la
 * alarma de cupo excedido dejaría de distinguirse.
 */
const STATUS_COUNTERS: Array<{
  key: string;
  label: string;
  icon: typeof Clock;
  className: string;
}> = [
  {
    key: 'pending',
    label: 'OT pendientes',
    icon: Clock,
    className: 'bg-muted text-muted-foreground ring-border',
  },
  {
    key: 'in_progress',
    label: 'OT en progreso',
    icon: PlayCircle,
    className: 'bg-blue-500/15 text-blue-700 ring-blue-500/30 dark:text-blue-300',
  },
  {
    key: 'paused',
    label: 'OT pausadas',
    icon: Pause,
    className: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  },
];

/** Clases base de cada chip del header (las de color se agregan por chip). */
const CHIP_CLASSES = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ring-1';

interface SectorItem extends WorkshopSectorWithCount {
  /** JSX con la tabla de OT renderizada por el Server Component padre */
  content: ReactNode;
}

interface WorkshopSectorsAccordionProps {
  sectors: SectorItem[];
}

/**
 * Semáforo de cupos del sector (ticket 678).
 *
 * Sólo aparece si el sector tiene cupo configurado (`max_capacity`): no todos lo
 * tienen y un cupo indefinido no se puede semaforear.
 *
 * El cupo NO es limitante — se pueden meter más unidades de las que entran — por
 * eso existe el tercer chip de "cupo excedido", que aparece únicamente cuando la
 * ocupación supera la capacidad.
 */
function SectorCapacityChips({ sector }: { sector: SectorItem }) {
  if (sector.maxCapacity == null) return null;

  const available = sector.availableSlots ?? 0;
  const hasAvailable = available > 0;
  const excess = sector.occupiedSlots - sector.maxCapacity;

  return (
    <>
      <span
        title="Unidades que entran en el sector"
        className={cn(CHIP_CLASSES, 'bg-muted text-foreground ring-border')}
      >
        <Gauge className="h-3 w-3" />
        Cupo del sector: {sector.maxCapacity}
      </span>

      <span
        title={
          hasAvailable
            ? 'Cupos libres — hay lugar para más unidades'
            : 'Sector completo — no hay lugar para más unidades'
        }
        className={cn(
          CHIP_CLASSES,
          hasAvailable
            ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
            : 'bg-red-500/15 text-red-700 ring-red-500/40 dark:text-red-300'
        )}
      >
        {hasAvailable ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        Cupos disponibles: {available}
      </span>

      {sector.isOverCapacity ? (
        <span
          title={`Hay ${sector.occupiedSlots} unidades en un sector con cupo para ${sector.maxCapacity}`}
          className={cn(CHIP_CLASSES, 'bg-red-600 text-white ring-red-700')}
        >
          <AlertTriangle className="h-3 w-3" />
          Cupo excedido (+{excess})
        </span>
      ) : null}
    </>
  );
}

/**
 * Lista de acordeones (multi-expand) — un ítem por sector de taller.
 * Muestra icono, nombre del sector, taller al que pertenece, descripción,
 * el semáforo de cupos y el count de OT por estado. El contenido expandido es
 * la tabla pre-renderizada por el Server Component padre.
 */
function WorkshopSectorsAccordionInner({ sectors }: WorkshopSectorsAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {sectors.map((sector) => (
        <AccordionItem
          key={sector.id}
          value={sector.id}
          className={cn(
            'group/sector relative overflow-hidden rounded-lg border bg-card last:border-b',
            'transition-[border-color,box-shadow,background-color] duration-200',
            'data-[state=open]:shadow-sm',
            // Sector por encima de su capacidad: el acordeón entero se marca en rojo
            sector.isOverCapacity
              ? 'border-red-500/50 bg-red-500/5 hover:border-red-500/70 data-[state=open]:border-red-500/70'
              : 'border-border/60 hover:border-border data-[state=open]:border-border'
          )}
        >
          {/* Barra de acento vertical (lado izquierdo) */}
          <div
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-1 transition-opacity',
              'opacity-50 group-hover/sector:opacity-80',
              'group-data-[state=open]/sector:opacity-100',
              sector.isOverCapacity ? 'bg-red-600' : 'bg-primary/70'
            )}
            aria-hidden
          />

          <AccordionTrigger
            className={cn(
              'py-3.5 pl-5 pr-4 hover:no-underline',
              'data-[state=open]:border-b data-[state=open]:border-border/50'
            )}
          >
            <div className="flex flex-1 flex-wrap items-center gap-3 text-left">
              {/* Chip con icono */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-border/60">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Nombre + taller + descripción */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">{sector.name}</span>
                  {sector.workshopName ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {sector.workshopName}
                    </span>
                  ) : null}
                </div>
                {sector.description ? (
                  <span className="truncate text-xs font-normal text-muted-foreground">{sector.description}</span>
                ) : null}
              </div>

              {/* Semáforo de cupos + contadores de OT por estado */}
              <div className="ml-auto mr-2 flex flex-wrap items-center justify-end gap-1">
                <SectorCapacityChips sector={sector} />

                {STATUS_COUNTERS.map((counter) => {
                  const count = sector.statusCounts[counter.key] ?? 0;
                  if (count === 0) return null;
                  const Icon = counter.icon;
                  return (
                    <span key={counter.key} title={counter.label} className={cn(CHIP_CLASSES, counter.className)}>
                      <Icon className="h-3 w-3" />
                      {count}
                    </span>
                  );
                })}

                {/* Tareas asignadas al sector que todavía no tienen OT generada */}
                {sector.unassignedTaskCount > 0 ? (
                  <span
                    title="Tareas asignadas al sector sin OT generada"
                    className={cn(CHIP_CLASSES, 'bg-muted text-muted-foreground ring-border')}
                  >
                    <CircleDashed className="h-3 w-3" />
                    {sector.unassignedTaskCount} sin OT
                  </span>
                ) : null}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="bg-muted/40 px-4 pb-4 pt-4">{sector.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export const WorkshopSectorsAccordion = memo(WorkshopSectorsAccordionInner);
