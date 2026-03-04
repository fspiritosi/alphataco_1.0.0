import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dashboard loading skeleton.
 * Matches DashboardComponent layout: TabsManagerServer with 3 tabs,
 * and the "Principal" tab content (PrincipalTabContent) which has
 * a 1/4 + 3/4 grid layout with multiple Cards containing charts.
 *
 * Note: Sidebar and Navbar are in the layout with their own Suspense,
 * this only covers the content area (px-6 pb-4 wrapper).
 */
export default function Loading() {
  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-4">
        <Skeleton className="h-10 w-28 rounded-t-md" />
        <Skeleton className="h-10 w-36 rounded-t-md" />
        <Skeleton className="h-10 w-32 rounded-t-md" />
      </div>

      {/* Principal tab content — grid 1/4 + 3/4 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        {/* Columna izquierda (1 col) */}
        <div className="col-span-1 flex flex-col gap-4">
          {/* ResourcesOverviewChart — PieChart donut */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3 w-24" />
            <div className="flex justify-center items-center py-4">
              <div className="relative w-48 h-48">
                <Skeleton className="absolute inset-0 rounded-full" />
                <div className="absolute inset-8 rounded-full bg-background flex items-center justify-center">
                  <Skeleton className="h-10 w-14" />
                </div>
              </div>
            </div>
          </div>

          {/* ServicesDistributionSection — Tabla */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
            <Skeleton className="h-9 w-full mt-2" />
          </div>

          {/* PieChart por cliente */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-56" />
            <div className="flex justify-center py-4">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Columna derecha (3 cols) */}
        <div className="col-span-1 xl:col-span-3 flex flex-col gap-4">
          {/* EmployeeDiagramsDataSection */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            {/* PositionFilterCard */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-9 w-48" />
            </div>
            {/* Grid 2 col: PieChart + IndicatorCard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 flex justify-center items-center">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          {/* EquipmentChart */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-48 w-full" />
          </div>

          {/* EquipmentDataSection — 2 grids de 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-36 w-full" />
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-12 w-20 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-36 w-full" />
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-12 w-20 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
