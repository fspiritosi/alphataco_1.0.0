import TypesDocumentsViewWrapper from '@/app/dashboard/document/documentComponents/TypesDocumentsViewWrapper';
import RepairTypes from '@/components/Tipos_de_reparaciones/RepairTypes';
import { TabsManagerServer } from '@/features/TabsManager';
import { FileText, FileType, Truck, Wrench } from 'lucide-react';
import { Suspense } from 'react';
import DocumentosEquiposTabContent from './DocumentosEquipos/DocumentosEquiposTabContent';
import EquiposTabContent from './Equipos/EquiposTabContent';

export default function EquiposComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="equipos"
        dependentParams={['subtab']}
        tabs={[
          {
            value: 'equipos',
            label: (
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Equipos
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'equipos',
            content: <EquiposTabContent searchParams={searchParams} />,
          },
          {
            value: 'documentos-de-equipos',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos de Equipos
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'documentos-de-equipos',
            content: <DocumentosEquiposTabContent searchParams={searchParams} />,
          },
          {
            value: 'tipos-de-documentos',
            label: (
              <span className="flex items-center gap-2">
                <FileType className="h-4 w-4" />
                Tipos de Documentos
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'tipos-de-documentos',
            content: (
              <Suspense fallback={<div>Cargando tipos de documentos...</div>}>
                <TypesDocumentsViewWrapper equipos={true} personas={false} optionChildrenProp="Equipo" />
              </Suspense>
            ),
          },
          {
            value: 'type_of_repairs',
            label: (
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Mantenimiento
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'type_of_repairs',
            content: <RepairTypes searchParams={searchParams} moduleSlug="equipos" />,
          },
        ]}
      />
    </div>
  );
}
