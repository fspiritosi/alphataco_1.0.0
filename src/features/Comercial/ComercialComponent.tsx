import { TabsManagerServer } from '@/features/TabsManager';
import { Store } from 'lucide-react';
import ComerceTabContent from './Comerce/ComerceTabContent';

export default function ComercialComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="px-6">
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="comerce"
        dependentParams={['subtab']}
        tabs={[
          {
            value: 'comerce',
            label: (
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Comercial
              </span>
            ),
            moduleSlug: 'comercial',
            tabSlug: 'comerce',
            content: <ComerceTabContent searchParams={searchParams} />,
          },
        ]}
      />
    </div>
  );
}
