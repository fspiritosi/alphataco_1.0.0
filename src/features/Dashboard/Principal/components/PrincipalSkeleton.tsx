import { KpiCardsSkeleton } from '../fallback/KpiCardsSkeleton';
import { SectionSkeleton } from '../fallback/SectionSkeleton';

export default function PrincipalSkeleton() {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <KpiCardsSkeleton />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  );
}
