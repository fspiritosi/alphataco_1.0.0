'use client';

// Thin client wrapper required because Next.js 16 Server Components cannot use
// next/dynamic with ssr: false. Recharts needs ssr: false to avoid hydration errors.
import dynamic from 'next/dynamic';
import type { PreparteKpiData } from '../actions/preparte-kpi.server';
import { OrderManagementSkeleton } from '../fallback/OrderManagementSkeleton';

const OrderManagementClient = dynamic(() => import('./OrderManagementClient').then((m) => m.OrderManagementClient), {
  ssr: false,
  loading: () => <OrderManagementSkeleton />,
});

interface Props {
  data: PreparteKpiData;
}

export function OrderManagementDynamic({ data }: Props) {
  return <OrderManagementClient data={data} />;
}
