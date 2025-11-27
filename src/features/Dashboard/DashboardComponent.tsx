import PrincipalSkeleton from '@/features/Dashboard/Principal/components/PrincipalSkeleton';
import { TabsManagerServer } from '@/features/TabsManager';
import { BarChart3, FileText, Home } from 'lucide-react';
import { Suspense } from 'react';
import DocumentsTabContent from './Documentacion/DocumentsTabContent';
import EstadisticasTabComponent from './Estadisticas/EstadisticasTabComponent';
import PrincipalTabContent from './Principal/PrincipalTabContent';

export default function DashboardComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      {/* Main Tabs con TabsManagerServer */}
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="principal"
        dependentParams={['subtab']} // Limpia 'subtab' al cambiar de tab principal
        tabs={[
          {
            value: 'principal',
            label: (
              <span className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Principal
              </span>
            ),
            moduleSlug: 'dashboard',
            tabSlug: 'principal',
            content: (
              <Suspense fallback={<PrincipalSkeleton />}>
                <PrincipalTabContent />
              </Suspense>
            ),
          },
          {
            value: 'documentacion',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentación
              </span>
            ),
            moduleSlug: 'dashboard',
            tabSlug: 'documentacion',
            content: <DocumentsTabContent searchParams={searchParams} />,
          },
          {
            value: 'estadisticas',
            label: (
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Estadísticas
              </span>
            ),
            moduleSlug: 'dashboard',
            tabSlug: 'estadisticas',
            content: <EstadisticasTabComponent searchParams={searchParams} />,
          },
        ]}
      />
    </div>
  );
}
