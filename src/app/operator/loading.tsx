import { Skeleton } from '@/components/ui/skeleton';

/**
 * Operator root loading skeleton.
 * The /operator page just redirects, but this skeleton covers the brief
 * loading moment. Matches the operator panel layout structure:
 * header + content area with work order list.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* OperatorHeader skeleton */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95">
        <div className="container flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex flex-1 items-center gap-2.5 sm:gap-3">
            <Skeleton className="h-9 w-9 rounded-lg sm:h-10 sm:w-10" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32 sm:w-40" />
              <Skeleton className="h-3 w-24 sm:w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-10 sm:w-20 rounded-md" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        <div className="space-y-5">
          {/* Titulo + subtitulo */}
          <div className="space-y-1">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>

          {/* Search bar */}
          <Skeleton className="h-11 w-full rounded-xl" />

          {/* Filter pills */}
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>

          {/* Work Order Cards */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-l-4 border-l-blue-500 bg-card p-4 sm:p-5">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-6 w-28" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-5 rounded" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
