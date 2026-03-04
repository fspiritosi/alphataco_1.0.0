import { Skeleton } from '@/components/ui/skeleton';
import CustomerEquipmentTabWrapper from '@/features/Comercial/Comerce/components/CustomerEquipmentTabWrapper';
import CustomerTabWrapper from '@/features/Comercial/Comerce/components/CustomerTabWrapper';
import DataCustomersWrapper from '@/features/Comercial/Comerce/components/DataCustomersWrapper';
import DayliReportWraper from '@/features/Comercial/Comerce/components/DayliReportWraper';
import MensureUnitsWrapper from '@/features/Comercial/Comerce/components/MensureUnitsWrapper';
import SectorTabsWrapper from '@/features/Comercial/Comerce/components/SectorTabsWrapper';
import ServiceComponentWrapper from '@/features/Comercial/Comerce/components/ServiceComponentWrapper';
import { TabsManagerServer } from '@/features/TabsManager';
import { ClipboardList, FileText, Grid, MapPin, Ruler, Truck, Users } from 'lucide-react';
import { Suspense } from 'react';

export default function ComerceTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="customers"
      permissions={permissions}
      tabs={[
        {
          value: 'customers',
          label: (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'customers',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <DataCustomersWrapper />
            </Suspense>
          ),
        },
        {
          value: 'areas',
          label: (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Áreas
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'areas',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <CustomerTabWrapper />
            </Suspense>
          ),
        },
        {
          value: 'equipment',
          label: (
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Equipos
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'equipment',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <CustomerEquipmentTabWrapper />
            </Suspense>
          ),
        },
        {
          value: 'sector',
          label: (
            <span className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Sectores
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'sector',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <SectorTabsWrapper />
            </Suspense>
          ),
        },
        {
          value: 'service',
          label: (
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contratos
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'service',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <ServiceComponentWrapper />
            </Suspense>
          ),
        },
        {
          value: 'mensure_units',
          label: (
            <span className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Unidades de Medida
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'mensure_units',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <MensureUnitsWrapper />
            </Suspense>
          ),
        },
        {
          value: 'daily_reports',
          label: (
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Partes Diarios
            </span>
          ),
          moduleSlug: 'comercial',
          tabSlug: 'daily_reports',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <DayliReportWraper />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
