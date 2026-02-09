import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function StatusCardSkeleton() {
  return (
    <div className="flex-shrink-0 min-w-[120px] rounded-lg border p-3 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-10" />
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2">
        {/* Search input */}
        <Skeleton className="h-9 w-[200px]" />
        {/* Filter buttons */}
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex items-center gap-2">
        {/* View options / export */}
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

function TableHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[120px]" />
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-4 w-[90px]" />
      <Skeleton className="h-4 w-[70px]" />
      <Skeleton className="h-4 w-[60px]" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[120px]" />
      <Skeleton className="h-5 w-[70px] rounded-full" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-4 w-[90px]" />
      <Skeleton className="h-5 w-[60px] rounded-full" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

export function PreparteSkeleton() {
  return (
    <Card className="flex w-full gap-4 p-6">
      <div className="space-y-6 w-full max-w-[100vw] px-4">
        {/* Header: titulo + boton */}
        <div className="flex justify-between items-center w-full">
          <Skeleton className="h-8 w-[220px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>

        {/* Status cards */}
        <div className="flex w-full overflow-x-auto pb-2 mb-6">
          <div className="flex flex-nowrap gap-2 min-w-max w-full">
            {Array.from({ length: 7 }).map((_, i) => (
              <StatusCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Tabla */}
        <Card className="w-full">
          <CardContent className="p-2">
            <ToolbarSkeleton />
            <div className="rounded-md border">
              <TableHeaderSkeleton />
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between py-3 px-4">
              <Skeleton className="h-4 w-[180px]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Card>
  );
}
