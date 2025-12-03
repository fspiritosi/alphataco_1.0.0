import { Card } from '@/components/ui/card';
import OperacionesTabContent from '@/features/Dashboard/Estadisticas/Operaciones/OperacionesTabContent';
import { TabsManagerServer } from '@/features/TabsManager';
import FeatureFlagShow from '@/shared/components/posthug/FeatureFlagShow';
import { Calendar, Users } from 'lucide-react';
import { Suspense } from 'react';
import { AbsenteeismDashboard } from './RecursosHumanos/absenteeism-dashboard';

function EstadisticasTabComponent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <FeatureFlagShow featureFlagName="mostrar_tab_de_graficos_en_dashboard">
      {/* Nested Tabs para Estadísticas */}
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="operaciones"
        permissions={permissions}
        tabs={[
          {
            value: 'operaciones',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Operaciones
              </span>
            ),
            moduleSlug: 'dashboard',
            tabSlug: 'operaciones',
            content: (
              <Suspense fallback={<div>Cargando operaciones...</div>}>
                <OperacionesTabContent />
              </Suspense>
            ),
          },
          {
            value: 'rrhh',
            label: (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                RRHH
              </span>
            ),
            moduleSlug: 'dashboard',
            tabSlug: 'rrhh',
            content: (
              <Card className="grid grid-cols-1 gap-3 mb-4 p-4">
                <AbsenteeismDashboard />
              </Card>
            ),
          },
          // {
          //     value: 'mantenimiento',
          //     label: (
          //         <span className="flex items-center gap-2">
          //             <Wrench className="h-4 w-4" />
          //             Mantenimiento
          //         </span>
          //     ),
          //     moduleSlug: 'dashboard',
          //     tabSlug: 'mantenimiento',
          //     content: (
          //         <section className="md:mx-7 grid grid-cols-1 mt-6 gap-3 mb-4">
          //             {/* Maintenance statistics content will go here */}
          //         </section>
          //     ),
          // },
        ]}
      />
    </FeatureFlagShow>
  );
}

export default EstadisticasTabComponent;
