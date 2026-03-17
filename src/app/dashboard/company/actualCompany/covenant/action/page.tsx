import { Skeleton } from '@/components/ui/skeleton';
import ConvenantComponent from '@/features/Empresa/CCT/components/CovenantComponent';
import { cn } from '@/lib/utils';
import BackButton from '@/shared/components/common/BackButton';
import { Suspense } from 'react';

export default async function CovenantFormAction({ searchParams, params }: { searchParams: any; params: any }) {
  return (
    <section className="grid grid-cols-2 xl:grid-cols-2 gap-2 py-4 justify-start">
      <div className=" flex gap-2">
        <BackButton />
      </div>

      <div
        className={cn(
          'col-span-6 flex flex-col justify-between overflow-hidden',
          searchParams.action === 'new' && 'col-span-8'
        )}
      >
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
          <ConvenantComponent id={searchParams.id} />
        </Suspense>
      </div>
    </section>
  );
}
