import { TabsManagerServer } from '@/features/TabsManager';
import { BarChart3, Package, Ruler, Tag } from 'lucide-react';
import ClothingBrandsTabContent from './ClothingBrands/ClothingBrandsTabContent';
import ClothingItemsTabContent from './ClothingItems/ClothingItemsTabContent';
import ClothingReportsTabContent from './ClothingReports/ClothingReportsTabContent';
import ClothingSizesTabContent from './ClothingSizes/ClothingSizesTabContent';

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}

export default async function ClothingCatalogTabContent({ searchParams, permissions }: Props) {
  return (
    <TabsManagerServer
      paramName="clothing-tab"
      searchParams={searchParams}
      defaultTab="articulos"
      permissions={permissions}
      tabs={[
        {
          value: 'articulos',
          label: (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Artículos
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'articulos_indumentaria',
          content: <ClothingItemsTabContent searchParams={searchParams} permissions={permissions} />,
        },
        {
          value: 'marcas',
          label: (
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Marcas
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'marcas_indumentaria',
          content: <ClothingBrandsTabContent searchParams={searchParams} permissions={permissions} />,
        },
        {
          value: 'talles',
          label: (
            <span className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Talles
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'talles_indumentaria',
          content: <ClothingSizesTabContent searchParams={searchParams} permissions={permissions} />,
        },
        {
          value: 'reportes',
          label: (
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'reportes_indumentaria',
          content: <ClothingReportsTabContent searchParams={searchParams} />,
        },
      ]}
    />
  );
}
