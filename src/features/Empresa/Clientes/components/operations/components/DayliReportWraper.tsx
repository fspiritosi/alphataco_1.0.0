'use server';

import { Skeleton } from '@/components/ui/skeleton';
import { getAllDailyReportRows } from '@/features/Empresa/Clientes/components/operations/actions/actions';
import ComercialReportTable from '@/features/Empresa/Clientes/components/operations/components/ComercialReportTable';
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
    equipment_id: { id: string; domain: string | null };
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

// Update the DayliReportWraper.tsx
export default async function DayliReportWraper() {
  try {
    const reports = await getAllDailyReportRows();

    // In DayliReportWraper.tsx, replace the tableData processing with:
    const tableData = reports.map((row) => {
      // Get employees
      const employees =
        row.dailyreportemployeerelations
          ?.map((rel) => `${rel.employees?.firstname || ''} ${rel.employees?.lastname || ''}`.trim())
          .filter(Boolean) || [];

      // Get company equipment
      const companyEquipment =
        row.dailyreportequipmentrelations
          ?.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number || '')
          .filter(Boolean) || [];

      // Get customer equipment
      const customerEquipment =
        row.dailyreport_customer_equipment_relations?.map((rel) => rel.equipos_clientes?.name || '').filter(Boolean) ||
        [];

      return {
        id: row.id,
        date: row.date,
        customer: row.customers?.name || 'Sin cliente',
        type_service: row.type_service || 'No especificada',
        item: row.service_items?.item_name || 'Sin ítem',
        description: row.description || '',
        status: row.status || 'pendiente',
        start_time: row.start_time,
        end_time: row.end_time,
        employees,
        company_equipment: companyEquipment, // Company vehicles
        customer_equipment: customerEquipment, // Customer equipment
        document_url: row.document_path || '', // Document URL
        services: row.customer_services?.service_name || 'Sin servicio',
        working_day: row.working_day || 'No especificada',
        area: row.service_areas?.areas_cliente?.nombre || 'Sin área',
        sector: row.service_sectors?.sectors?.name || 'Sin sector',
        remit_number: row.remit_number as string,
      };
    });

    return (
      <Suspense
        fallback={
          <div className="space-y-4">
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
