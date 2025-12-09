import { getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { FileText } from 'lucide-react';
import { Suspense } from 'react';
import FormulariosTabContent from './Formularios/FormulariosTabContent';

export default async function FormulariosComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="formularios"
        permissions={permissions}
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
