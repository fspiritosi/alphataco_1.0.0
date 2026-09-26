import { TablePageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TablePageSkeleton title showBackButton columnCount={5} />;
}
