import { TabsManagerServer } from '@/features/TabsManager';
import { Building2, Truck, Users } from 'lucide-react';
import EquipmentsTabContent from './Equipos/EquipmentsTabContent';
import GeneralTabContent from './General/GeneralTabContent';
import RrhhTabContent from './RRHH/RrhhTabContent';

export default function EmpresaComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="general"
      dependentParams={['subtab']}
      tabs={[
        {
          value: 'general',
          label: (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              General
            </span>
          ),
          moduleSlug: 'empresa',
          tabSlug: 'general',
          content: <GeneralTabContent searchParams={searchParams} />,
        },
        {
          value: 'rrhh',
          label: (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              RRHH
            </span>
          ),
          moduleSlug: 'empresa',
          tabSlug: 'rrhh',
          content: <RrhhTabContent searchParams={searchParams} />,
        },
        {
          value: 'vehicles',
          label: (
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Equipos
            </span>
          ),
          moduleSlug: 'empresa',
          tabSlug: 'vehicles',
          content: <EquipmentsTabContent searchParams={searchParams} />,
        },
      ]}
    />
  );
}
