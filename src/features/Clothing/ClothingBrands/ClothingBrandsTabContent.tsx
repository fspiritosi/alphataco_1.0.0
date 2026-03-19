import { Suspense } from 'react';
import ClothingBrandsList from './ClothingBrandsList/ClothingBrandsList';
import { ClothingBrandsTableSkeleton } from './ClothingBrandsList/fallback/ClothingBrandsTableSkeleton';

// ============================================================================
// TYPES
// ============================================================================

interface ClothingBrandsTabContentProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function ClothingBrandsTabContent({ searchParams, permissions }: ClothingBrandsTabContentProps) {
  return (
    <Suspense fallback={<ClothingBrandsTableSkeleton />}>
      <ClothingBrandsList searchParams={searchParams} permissionsMap={permissions} />
    </Suspense>
  );
}
