import { Building2 } from 'lucide-react';
import { Suspense } from 'react';
import { WorkshopSectorTasksList } from './WorkshopSectorTasksTable/WorkshopSectorTasksList';
import { WorkshopSectorTasksSkeleton } from './WorkshopSectorTasksTable/fallback/WorkshopSectorTasksSkeleton';
import { getWorkshopSectorsWithCounts } from './actions.server';
import { WorkshopSectorsAccordion } from './components/WorkshopSectorsAccordion';

interface WorkshopViewTabContentProps {
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Vista Taller (COD-394) — agrupa las tareas de mantenimiento por sector.
 *
 * Arquitectura:
 *  - Una sola llamada trae todos los sectores activos con su cupo y el conteo de
 *    ÓRDENES DE TRABAJO abiertas por estado (ticket 678: antes contaba tareas).
 *  - Cada acordeón recibe la tabla de OT de su sector pre-renderizada,
 *    envuelta en un Suspense propio para streaming independiente.
 *  - Acordeones colapsados siguen mostrando los contadores y el semáforo de
 *    cupos; su contenido se desmonta del DOM (Radix) pero ya vive en el RSC
 *    payload — expandir es instantáneo.
 */
export async function WorkshopViewTabContent({ searchParams }: WorkshopViewTabContentProps) {
  const sectors = await getWorkshopSectorsWithCounts();

  if (sectors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/50 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Sin sectores configurados</p>
          <p className="text-xs text-muted-foreground">No hay sectores de taller activos para mostrar.</p>
        </div>
      </div>
    );
  }

  const items = sectors.map((sector) => ({
    ...sector,
    content: (
      <Suspense fallback={<WorkshopSectorTasksSkeleton />}>
        <WorkshopSectorTasksList sectorId={sector.id} searchParams={searchParams} />
      </Suspense>
    ),
  }));

  return <WorkshopSectorsAccordion sectors={items} />;
}
