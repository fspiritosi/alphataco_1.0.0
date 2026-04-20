'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Building2, Wrench } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import type { WorkshopSectorWithCount } from '../actions.server';

interface SectorItem extends WorkshopSectorWithCount {
  /** JSX con la tabla de tareas renderizada por el Server Component padre */
  content: ReactNode;
}

interface WorkshopSectorsAccordionProps {
  sectors: SectorItem[];
}

/**
 * Lista de acordeones (multi-expand) — un ítem por sector de taller.
 * Muestra icono, nombre del sector, taller al que pertenece, descripción
 * y count de tareas. El contenido expandido es la tabla pre-renderizada
 * por el Server Component padre.
 */
function WorkshopSectorsAccordionInner({ sectors }: WorkshopSectorsAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {sectors.map((sector) => (
        <AccordionItem
          key={sector.id}
          value={sector.id}
          className={cn(
            'group/sector relative overflow-hidden rounded-lg border border-border/60 bg-card last:border-b',
            'transition-[border-color,box-shadow,background-color] duration-200',
            'hover:border-border',
            'data-[state=open]:border-border data-[state=open]:shadow-sm'
          )}
        >
          {/* Barra de acento vertical (lado izquierdo) — neutra */}
          <div
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary/70 transition-opacity',
              'opacity-50 group-hover/sector:opacity-80',
              'group-data-[state=open]/sector:opacity-100'
            )}
            aria-hidden
          />

          <AccordionTrigger
            className={cn(
              'py-3.5 pl-5 pr-4 hover:no-underline',
              'data-[state=open]:border-b data-[state=open]:border-border/50'
            )}
          >
            <div className="flex flex-1 items-center gap-3 text-left">
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

              {/* Count pill */}
              <span
                className={cn(
                  'ml-auto mr-2 inline-flex min-w-9 items-center justify-center rounded-full',
                  'border border-border/70 bg-muted/60 px-2 py-0.5',
                  'font-mono text-xs tabular-nums text-muted-foreground',
                  sector.count === 0 && 'opacity-50'
                )}
              >
                {sector.count}
              </span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="bg-muted/40 px-4 pb-4 pt-4">{sector.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export const WorkshopSectorsAccordion = memo(WorkshopSectorsAccordionInner);
