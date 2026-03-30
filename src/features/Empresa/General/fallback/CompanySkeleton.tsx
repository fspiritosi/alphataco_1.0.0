import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton que replica el grid de InfoItems del CompanyComponent */
export function CompanySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-muted/20">
          <Skeleton className="h-5 w-5 mt-0.5 rounded" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
