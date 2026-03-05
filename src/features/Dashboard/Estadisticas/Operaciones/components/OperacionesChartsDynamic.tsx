'use client';

// Thin client wrapper required because Next.js 16 Server Components cannot use
// next/dynamic with ssr: false. Recharts needs ssr: false to avoid hydration errors.
import dynamic from 'next/dynamic';
import type { OperationsChartData } from '../actions/actions.server';
import { OperacionesChartsSkeleton } from '../fallback/OperacionesChartsSkeleton';

const OperacionesChartsClient = dynamic(
  () => import('./OperacionesChartsClient').then((m) => m.OperacionesChartsClient),
  { ssr: false, loading: () => <OperacionesChartsSkeleton /> }
);

interface Props {
  data: OperationsChartData;
}

export function OperacionesChartsDynamic({ data }: Props) {
  return <OperacionesChartsClient data={data} />;
}
