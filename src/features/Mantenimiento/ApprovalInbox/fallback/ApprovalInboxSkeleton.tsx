import { Skeleton } from '@/components/ui/skeleton';

export function ApprovalInboxSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
