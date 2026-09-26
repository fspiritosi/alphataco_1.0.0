import { TabsPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TabsPageSkeleton tabCount={5} hasSubtabs subtabCount={3} />;
}
