'use client';

// Thin client wrapper required because Next.js 16 Server Components cannot use
// next/dynamic with ssr: false. Recharts needs ssr: false to avoid hydration errors.
import dynamic from 'next/dynamic';
import { MantenimientoChartsSkeleton } from '../fallback/MantenimientoChartsSkeleton';
import type { MaintenanceMonthSummary } from '../types';

const MantenimientoChartsClient = dynamic(
  () => import('./MantenimientoChartsClient').then((m) => m.MantenimientoChartsClient),
  { ssr: false, loading: () => <MantenimientoChartsSkeleton /> }
);

interface Props {
  initialSummary: MaintenanceMonthSummary;
  initialMonthKey: string;
}

export function MantenimientoChartsDynamic({ initialSummary, initialMonthKey }: Props) {
  return <MantenimientoChartsClient initialSummary={initialSummary} initialMonthKey={initialMonthKey} />;
}
