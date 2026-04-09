import { Suspense } from 'react';
import ClothingItemsList from './ClothingItemsList/ClothingItemsList';
import { ClothingItemsTableSkeleton } from './ClothingItemsList/fallback/ClothingItemsTableSkeleton';

// ============================================================================
// TYPES
// ============================================================================

interface ClothingItemsTabContentProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function ClothingItemsTabContent({ searchParams, permissions }: ClothingItemsTabContentProps) {
  return (
    <Suspense fallback={<ClothingItemsTableSkeleton />}>
      <ClothingItemsList searchParams={searchParams} permissionsMap={permissions} />
    </Suspense>
  );
}
