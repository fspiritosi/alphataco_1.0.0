'use client';

// Wrapper de cliente necesario porque los Server Components de Next.js 16 no pueden
// usar next/dynamic con ssr: false, y recharts lo necesita para no romper hidratacion.
import dynamic from 'next/dynamic';
import type { DeviationsChartData } from '../actions/actions.server';
import { DesviosChartsSkeleton } from '../fallback/DesviosChartsSkeleton';

const DesviosChartsClient = dynamic(() => import('./DesviosChartsClient').then((m) => m.DesviosChartsClient), {
  ssr: false,
  loading: () => <DesviosChartsSkeleton />,
});

interface Props {
  data: DeviationsChartData;
}

export function DesviosChartsDynamic({ data }: Props) {
  return <DesviosChartsClient data={data} />;
}
