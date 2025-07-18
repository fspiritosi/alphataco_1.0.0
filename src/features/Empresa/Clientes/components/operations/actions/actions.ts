import { supabaseServer } from '@/lib/supabase/server';

export async function getAllDailyReportRows() {
  const supabase = supabaseServer();

  const { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(
      `
        *,
        dailyreportrows(
          *,
          dailyreport_customer_equipment_relations(*, equipos_clientes(*) ),
          service_sectors(*, sectors(*) ),
          service_areas(*, areas_cliente(*) ),
          customer_services(id, service_name),
          service_items(id, item_name),
          remit_number,
          customers(id, name),
          dailyreportemployeerelations(employees(id, firstname, lastname)),
          dailyreportequipmentrelations(vehicles(id, intern_number, domain))
        )
      `
    )
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching daily reports:', error);
    throw error;
  }

  // Process the data to include remit_number in each row
  const processedData = dailyReports.flatMap((report) =>
    (report.dailyreportrows || []).map((row) => ({
      ...row,
      date: report.date,
      remit_number: row.remit_number,
      // Map other fields as needed
    }))
  );

  return processedData;
}
