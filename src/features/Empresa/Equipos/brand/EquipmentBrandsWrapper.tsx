import { Suspense } from 'react';
import EquipmentBrandList from '../EquipmentBrands/EquipmentBrandList';
import { EquipmentBrandTableSkeleton } from '../EquipmentBrands/fallback/EquipmentBrandTableSkeleton';

interface EquipmentBrandsWrapperProps {
  searchParams?: Record<string, string | string[] | undefined>;
  permissions?: Record<string, boolean>;
}

export default function EquipmentBrandsWrapper({ searchParams = {}, permissions = {} }: EquipmentBrandsWrapperProps) {
  return (
    <Suspense fallback={<EquipmentBrandTableSkeleton />}>
      <EquipmentBrandList searchParams={searchParams} permissions={permissions} />
    </Suspense>
  );
}
