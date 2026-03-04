import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface FormPageSkeletonProps {
  title?: boolean;
  showBackButton?: boolean;
  fieldCount?: number;
  columns?: 1 | 2;
}

export function FormPageSkeleton({
  title = true,
  showBackButton = true,
  fieldCount = 6,
  columns = 2,
}: FormPageSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-7 w-48" />}
          {showBackButton && <Skeleton className="h-9 w-24" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gap-6`}>
          {Array.from({ length: fieldCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
