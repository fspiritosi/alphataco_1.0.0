import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatusCardSkeleton() {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}
