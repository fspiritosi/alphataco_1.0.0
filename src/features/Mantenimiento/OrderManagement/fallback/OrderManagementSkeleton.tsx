import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OrderManagementSkeleton() {
  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Gestion de Ordenes</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
