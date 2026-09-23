import { Suspense } from 'react';
import { getServicesSummary } from './actions/services.server';
// import { ChecklistDeviationsDashboard } from './components/ChecklistDeviationsDashboard';
import { EquipmentFleetSection } from './components/EquipmentFleetSection';
import { EquipmentOperationSection } from './components/EquipmentOperationSection';
import { KpiCardsRow } from './components/KpiCardsRow';
import { RrhhSection } from './components/RrhhSection';
import { ServicesSection } from './components/ServicesSection';
import { KpiCardsSkeleton } from './fallback/KpiCardsSkeleton';
import { SectionSkeleton } from './fallback/SectionSkeleton';

async function ServicesSectionWrapper() {
  const servicesSummary = await getServicesSummary();
  return <ServicesSection servicesSummary={servicesSummary} />;
}

export default async function PrincipalTabContent() {
  return (
    <section className="flex flex-col gap-4 mb-4">
      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCardsRow />
      </Suspense>

      {/* <ChecklistDeviationsDashboard /> */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Suspense fallback={<SectionSkeleton />}>
          <ServicesSectionWrapper />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <RrhhSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <EquipmentOperationSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <EquipmentFleetSection />
        </Suspense>
      </div>
    </section>
  );
}
