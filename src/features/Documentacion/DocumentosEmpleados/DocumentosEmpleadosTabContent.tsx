import DocumentNav from '@/components/DocumentNav';
import MonthlyDocuments from '@/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';

export default function DocumentosEmpleadosTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <div className="flex gap-4 flex-wrap mb-4">
        <DocumentNav onlyEmployees />
      </div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="empleados-permanentes"
        tabs={[
          {
            value: 'empleados-permanentes',
            label: (
              <span className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Documentos Permanentes
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'empleados-permanentes',
            content: (
              <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
                <PermanentDocuments />
              </Suspense>
            ),
          },
          {
            value: 'empleados-mensuales',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Documentos Mensuales
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'empleados-mensuales',
            content: (
              <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
                <MonthlyDocuments />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
