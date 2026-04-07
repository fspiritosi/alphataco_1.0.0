import { Suspense } from 'react';
import ClothingReportsList from './ClothingReportsList/ClothingReportsList';
import { ClothingReportsTableSkeleton } from './ClothingReportsList/fallback/ClothingReportsTableSkeleton';

// ============================================================================
// TYPES
// ============================================================================

interface ClothingReportsTabContentProps {
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function ClothingReportsTabContent({ searchParams }: ClothingReportsTabContentProps) {
  return (
    <Suspense fallback={<ClothingReportsTableSkeleton />}>
      <ClothingReportsList searchParams={searchParams} />
    </Suspense>
  );
}
