'use server';

import { Skeleton } from '@/components/ui/skeleton';
import ComercialReportTable from '@/features/Empresa/Clientes/components/operations/components/ComercialReportTable';
import { getDailyReportsWithRows } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { Suspense } from 'react';

interface DailyReportRow {
  id: string;
  date: string;
  customer_id: { id: string; name: string } | null;
  service_id: { id: string; service_name: string } | null;
  item_id: { id: string; item_name: string } | null;
  description: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  dailyreportemployeerelations: Array<{
    employee_id: { id: string; firstname: string; lastname: string };
  }>;
  dailyreportequipmentrelations: Array<{
    equipment_id: { id: string; intern_number: string | null };
  }>;
}

interface ProcessedRow {
  id: string;
  date: string;
  customer: string;
  type_service: string;
  item: string;
  description: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  employees: string[];
  equipment: string[];
  services: string;
}

export default async function DayliReportWraper() {
  try {
    const reports = await getDailyReportsWithRows();

    // Procesar los datos para la tabla
    const tableData = reports.flatMap((report) =>
      report.dailyreportrows.map((row) => {
        // Obtener empleados
        const employees =
          row.dailyreportemployeerelations?.map((rel) => `${rel.employee_id.firstname} ${rel.employee_id.lastname}`) ||
          [];

        // Obtener equipos
        const equipment =
          row.dailyreportequipmentrelations?.map((rel) => rel.equipment_id.intern_number || 'Sin número') || [];

        return {
          id: row.id,
          date: report.date,
          customer: row.customer_id?.name || 'Sin cliente',
          type_service: row.service_id?.service_name || 'Sin servicio',
          item: row.item_id?.item_name || 'Sin ítem',
          description: row.description || '',
          status: row.status,
          start_time: row.start_time,
          end_time: row.end_time,
          employees,
          equipment,
          services: row.service_id?.service_name || 'Sin servicio',
        };
      })
    );

    return (
      <Suspense
        fallback={
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        }
      >
        <ComercialReportTable dailyReports={tableData} />
      </Suspense>
    );
  } catch (error) {
    console.error('Error al cargar los reportes:', error);
    return <div>Error al cargar los reportes. Por favor, intente nuevamente.</div>;
  }
}
