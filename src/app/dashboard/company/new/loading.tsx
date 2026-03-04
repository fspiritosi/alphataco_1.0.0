import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton showBackButton={false} fieldCount={10} />;
}
