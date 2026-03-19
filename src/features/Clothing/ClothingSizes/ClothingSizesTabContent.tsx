import { Suspense } from 'react';
import ClothingSizesList from './ClothingSizesList/ClothingSizesList';
import { ClothingSizesTableSkeleton } from './ClothingSizesList/fallback/ClothingSizesTableSkeleton';

// ============================================================================
// TYPES
// ============================================================================

interface ClothingSizesTabContentProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function ClothingSizesTabContent({ searchParams, permissions }: ClothingSizesTabContentProps) {
  return (
    <Suspense fallback={<ClothingSizesTableSkeleton />}>
      <ClothingSizesList searchParams={searchParams} permissionsMap={permissions} />
    </Suspense>
  );
}
