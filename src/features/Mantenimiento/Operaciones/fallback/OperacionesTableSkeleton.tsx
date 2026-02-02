import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OperacionesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
