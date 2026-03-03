import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton fieldCount={4} columns={1} showBackButton={false} />;
}
