import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

function TableHeaderSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3">
      <Skeleton className="h-4 w-4" />
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3">
      <Skeleton className="h-4 w-4" />
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4">
      <Skeleton className="h-4 w-[150px]" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

export function DataTableSkeleton({ columns = 6, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <Card className="p-6">
      <ToolbarSkeleton />
      <div className="rounded-md border">
        <TableHeaderSkeleton columns={columns} />
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
      <PaginationSkeleton />
    </Card>
  );
}
