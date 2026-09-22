'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { TabsManagerClient } from '@/features/TabsManager/TabsManagerClient';
import { Building2, Layers } from 'lucide-react';
import { Suspense } from 'react';
import type { Workshop, WorkshopSector } from '../../actions/workshops.server';
import { SectoresTabClient } from './sectores/SectoresTabClient';
import { TalleresTabClient } from './talleres/TalleresTabClient';

interface MantenimientoTabClientProps {
  workshops: Promise<Workshop[]>;
  workshopSectors: Promise<WorkshopSector[]>;
  internalWorkshops: Promise<{ id: string; name: string }[]>;
  savedVisibilityTalleres: Record<string, boolean>;
  savedFilterTalleres: string[];
  savedVisibilitySectores: Record<string, boolean>;
  savedFilterSectores: string[];
}

export function MantenimientoTabClient({
  workshops,
  workshopSectors,
  internalWorkshops,
  savedVisibilityTalleres,
  savedFilterTalleres,
  savedVisibilitySectores,
  savedFilterSectores,
}: MantenimientoTabClientProps) {
  return (
    <TabsManagerClient
      paramName="mantenimiento-subtab"
      defaultTab="talleres"
      tabs={[
        {
          value: 'talleres',
          label: (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Talleres
            </span>
          ),
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <TalleresTabClient
                workshops={workshops}
                savedVisibility={savedVisibilityTalleres}
                savedFilter={savedFilterTalleres}
              />
            </Suspense>
          ),
        },
        {
          value: 'sectores',
          label: (
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Sectores de Taller
            </span>
          ),
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <SectoresTabClient
                workshopSectors={workshopSectors}
                internalWorkshops={internalWorkshops}
                savedVisibility={savedVisibilitySectores}
                savedFilter={savedFilterSectores}
              />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
