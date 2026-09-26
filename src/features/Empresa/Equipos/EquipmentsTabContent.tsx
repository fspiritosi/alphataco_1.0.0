import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsManagerServer } from '@/features/TabsManager';
import { Box, Layers, Tag, Truck, User } from 'lucide-react';
import { Suspense } from 'react';
import EquipmentModelList from './EquipmentModels/EquipmentModelList';
import { EquipmentModelTableSkeleton } from './EquipmentModels/fallback/EquipmentModelTableSkeleton';
import EquipmentOwnersTabContent from './EquipmentOwners/EquipmentOwnersTabContent';
import EquipmentTypeList from './EquipmentTypes/EquipmentTypeList';
import { EquipmentTypeTableSkeleton } from './EquipmentTypes/fallback/EquipmentTypeTableSkeleton';
import EquipmentBrandList from './EquipmentBrands/EquipmentBrandList';
import { EquipmentBrandTableSkeleton } from './EquipmentBrands/fallback/EquipmentBrandTableSkeleton';
import EquipmentSubTypeList from './EquipmentSubTypes/EquipmentSubTypeList';
import { EquipmentSubTypeTableSkeleton } from './EquipmentSubTypes/fallback/EquipmentSubTypeTableSkeleton';
import { EquiposSubtabSkeleton } from './fallback/EquiposSubtabSkeleton';

export default function EquipmentsTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="tipos"
        permissions={permissions}
        tabs={[
          {
            value: 'tipos',
            label: (
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Tipos de Unidad
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'tipos',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Tipos de Unidad</CardTitle>
                  <CardDescription>Gestión de tipos de unidades</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<EquipmentTypeTableSkeleton />}>
                    <EquipmentTypeList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
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
            tabSlug: 'marcas',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Marcas</CardTitle>
                  <CardDescription>Gestión de marcas de equipos</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<EquipmentBrandTableSkeleton />}>
                    <EquipmentBrandList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'modelos',
            label: (
              <span className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                Modelos
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'modelos',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Modelos</CardTitle>
                  <CardDescription>Gestión de modelos de equipos</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<EquipmentModelTableSkeleton />}>
                    <EquipmentModelList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'subtipos',
            label: (
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Subtipos
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'subtipos',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Subtipos</CardTitle>
                  <CardDescription>Gestión de subtipos de equipos</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<EquipmentSubTypeTableSkeleton />}>
                    <EquipmentSubTypeList searchParams={searchParams} permissions={permissions} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'titulares',
            label: (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Titulares
              </span>
            ),
            moduleSlug: 'configuracion',
            tabSlug: 'titulares',
            content: (
              <Card>
                <CardHeader className="bg-surface dark:bg-muted/50 border-b-2">
                  <CardTitle>Titulares</CardTitle>
                  <CardDescription>Gestión de titulares de equipos</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Suspense fallback={<EquiposSubtabSkeleton />}>
                    <EquipmentOwnersTabContent searchParams={searchParams} />
                  </Suspense>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
