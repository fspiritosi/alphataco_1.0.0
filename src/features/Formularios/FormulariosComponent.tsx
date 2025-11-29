import { TabsManagerServer } from '@/features/TabsManager';
import { FileText } from 'lucide-react';
import { Suspense } from 'react';
import FormulariosTabContent from './Formularios/FormulariosTabContent';

export default function FormulariosComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="formularios"
        tabs={[
          {
            value: 'formularios',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Formularios
              </span>
            ),
            moduleSlug: 'formularios',
            tabSlug: 'formularios',
            content: (
              <Suspense fallback={<div>Cargando formularios...</div>}>
                <FormulariosTabContent />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
