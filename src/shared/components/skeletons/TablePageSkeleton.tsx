import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { TableSkeleton } from './TableSkeleton';

interface TablePageSkeletonProps {
  title?: boolean;
  showBackButton?: boolean;
  columnCount?: number;
  rowCount?: number;
}

export function TablePageSkeleton({
  title = true,
  showBackButton = true,
  columnCount = 6,
  rowCount = 8,
}: TablePageSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-7 w-48" />}
          {showBackButton && <Skeleton className="h-9 w-24" />}
        </div>
      </CardHeader>
      <CardContent>
        <TableSkeleton columnCount={columnCount} rowCount={rowCount} />
      </CardContent>
    </Card>
  );
}
