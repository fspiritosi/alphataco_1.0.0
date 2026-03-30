import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CovenantTreeSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        {/* Root node */}
        <div className="flex items-center gap-2 p-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-24" />
        </div>
        {/* Child nodes indented */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2" style={{ paddingLeft: '20px' }}>
            <div className="flex items-center gap-2 p-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-32" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 p-1" style={{ paddingLeft: '20px' }}>
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
