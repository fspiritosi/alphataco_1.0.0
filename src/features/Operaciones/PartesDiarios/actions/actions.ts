'use server';
import { DailyReportRowHistoryRecord, ProcessedHistoryEntry } from '@/app/server/colections';
import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';
import { cookies } from 'next/headers';

// export async function updateDailyReportStatus(id: string, status: string) {
//   const supabase = supabaseServer();
//   const { data, error } = await supabase
//     .from('dailyreport')
//     .update({
//       status: status,
//     })
//     .eq('id', id)
//     .select();

//   if (error) {
//     throw new Error(error.message);
//   }
//   return data;
// }

// En actions.ts
export async function fetchDailyReportsWithFilters({
  fromDate,
  toDate,
  status,
}: {
  fromDate?: string;
  toDate?: string;
  status?: string[] | null;
}) {
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!company_id && !user?.app_metadata?.company_id) {
    return [];
  }

  let query = supabase
    .from('dailyreport')
    .select(`*,dailyreportrows(status)`)
    .order('date', { ascending: false })
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');

  // Aplicar filtros de fecha si existen
  if (fromDate) {
    query = query.gte('date', fromDate);
  }

  if (toDate) {
    query = query.lte('date', toDate);
  }

  // Aplicar filtro de estado si existe
  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily reports:', error);
    throw error;
  }

  return data;
}
export async function getDailyReports() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(`*,dailyreportrows(status)`)
    .order('date', { ascending: false })
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');

  if (error) {
    console.error('Error fetching daily reports:', error);
    return [];
  }

  return dailyReports || [];
}
export async function getDailyReportsForCurrentMonth() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(`*,dailyreportrows(status)`)
    .gte('date', moment().startOf('month').format('YYYY-MM-DD'))
    .lte('date', moment().endOf('month').format('YYYY-MM-DD'))
    .order('date', { ascending: false })
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');

  if (error) {
    console.error('Error fetching daily reports:', error);
    return [];
  }

  return dailyReports || [];
}

export async function getDailyReportRowHistory(dailyReportId: string) {
  const supabase = supabaseServer();
  const { data: history, error } = await supabase
    .rpc('get_dailyreportrow_history', { p_row_id: dailyReportId })
    .returns<DailyReportRowHistoryRecord[]>();

  //Verifciar si la row pertenece a algun preparte
  const { data: preparteData, error: error2 } = await supabase
    .from('dailyreportrows')
    .select('preparte(id,numero_pedido)')
    .eq('id', dailyReportId);
  if (error2) {
    console.error('Error fetching daily report row history:', error2);
    return [];
  }

  if (error) {
    console.error('Error fetching daily report row history:', error);
    return [];
  }

  const processedHistory = history?.map((record) => {
    const entry: ProcessedHistoryEntry = {
      id: record.id,
      preparte: preparteData?.[0]?.preparte,
      actionType: record.action_type,
      timestamp: record.created_at,
      user: record.changed_by
        ? {
            id: record.changed_by.id,
            email: record.changed_by.email,
            name: record.changed_by.raw_user_meta_data?.full_name || record.changed_by.email,
          }
        : null,
      changes: [],
      relatedTable: record.related_table,
      relatedId: record.related_id,
      message: '',
      displayTime: new Date(record.created_at).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reassignment_reason: record.reassignment_reason,
    };

    // Get user info for message - asignar "Sistema" si no hay usuario
    const userName = entry.user?.name || 'El Sistema';

    if (record.action_type === 'UPDATE' && record.changed_fields) {
      const changedFieldMessages: string[] = [];

      Object.entries(record.changed_fields).forEach(([field, change]: [string, any]) => {
        // Add Spanish field names for known fields
        let fieldName = field;
        let oldValueDisplay = change.old;
        let newValueDisplay = change.new;

        // Translate field names
        switch (field) {
          case 'customer_id':
            fieldName = 'Cliente';
            break;
          case 'service_id':
            fieldName = 'Servicio';
            break;
          case 'item_id':
            fieldName = 'Item';
            break;
          case 'working_day':
            fieldName = 'Jornada';
            break;
          case 'remit_number':
            fieldName = 'Remito';
            // Special format for remit number - just show the new value
            changedFieldMessages.push(`${fieldName}: "${newValueDisplay || 'Sin valor'}"`);
            // Skip the default format
            entry.changes.push({
              field,
              fieldName,
              oldValue: change.old,
              newValue: change.new,
              oldValueDisplay,
              newValueDisplay,
            });
            return; // Skip the default message for this field
          case 'start_time':
            fieldName = 'Hora inicio';
            break;
          case 'end_time':
            fieldName = 'Hora fin';
            break;
          case 'description':
            fieldName = 'Descripción';
            break;
          case 'cancel_reason':
            fieldName = 'Razón';
            // Special format for cancel reason - just show the new value
            changedFieldMessages.push(`${fieldName}: "${newValueDisplay || 'Sin valor'}"`);
            // Skip the default format
            entry.changes.push({
              field,
              fieldName,
              oldValue: change.old,
              newValue: change.new,
              oldValueDisplay,
              newValueDisplay,
            });
            return; // Skip the default message for this field
          case 'status':
            fieldName = 'Estado';
            // Translate status values
            if (oldValueDisplay === 'pendiente') oldValueDisplay = 'Pendiente';
            if (oldValueDisplay === 'ejecutado') oldValueDisplay = 'Ejecutado';
            if (oldValueDisplay === 'cancelado') oldValueDisplay = 'Cancelado';
            if (oldValueDisplay === 'reprogramado') oldValueDisplay = 'Reprogramado';
            if (oldValueDisplay === 'sin_recursos_asignados') oldValueDisplay = 'Sin recursos asignados';

            if (newValueDisplay === 'pendiente') newValueDisplay = 'Pendiente';
            if (newValueDisplay === 'ejecutado') newValueDisplay = 'Ejecutado';
            if (newValueDisplay === 'cancelado') newValueDisplay = 'Cancelado';
            if (newValueDisplay === 'reprogramado') newValueDisplay = 'Reprogramado';
            if (newValueDisplay === 'sin_recursos_asignados') newValueDisplay = 'Sin recursos asignados';
            break;
          case 'type_service':
            fieldName = 'Tipo de servicio';
            // Translate type_service values
            if (oldValueDisplay === 'mensual') oldValueDisplay = 'Mensual';
            if (oldValueDisplay === 'adicional') oldValueDisplay = 'Adicional';

            if (newValueDisplay === 'mensual') newValueDisplay = 'Mensual';
            if (newValueDisplay === 'adicional') newValueDisplay = 'Adicional';
            break;
          default:
            fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            break;
        }

        // Add the change message showing old and new values
        changedFieldMessages.push(
          `${fieldName} de "${oldValueDisplay || 'Sin valor'}" a "${newValueDisplay || 'Sin valor'}"`
        );

        entry.changes.push({
          field,
          fieldName,
          oldValue: change.old,
          newValue: change.new,
          oldValueDisplay,
          newValueDisplay,
        });
      });

      // Create Spanish message with detailed changes
      entry.message = `${userName} modificó: ${changedFieldMessages.join(', ')}`;
    } else if (record.action_type === 'LINK' || record.action_type === 'UNLINK') {
      const relationType = record.related_table;
      const relationData = record.changed_data;
      const action = record.action_type === 'LINK' ? 'agregó' : 'eliminó';

      if (relationType === 'dailyreport_customer_equipment_relations') {
        const equipmentName = relationData?.equipo_nombre || 'Equipo desconocido';

        entry.changes.push({
          type: 'equipment_relation',
          action: record.action_type === 'LINK' ? 'added' : 'removed',
          equipment: {
            id: relationData?.equipo_id,
            name: equipmentName,
            identifier: relationData?.equipo_identificador,
          },
        });

        entry.message = `${userName} ${action} el equipo del cliente: ${equipmentName}`;
      } else if (relationType === 'dailyreportemployeerelations') {
        const employeeName = relationData?.empleado_nombre || 'Empleado desconocido';

        entry.changes.push({
          type: 'employee_relation',
          action: record.action_type === 'LINK' ? 'added' : 'removed',
          employee: {
            id: relationData?.empleado_id,
            name: employeeName,
          },
        });

        entry.message = `${userName} ${action} el empleado: ${employeeName}`;
      } else if (relationType === 'dailyreportequipmentrelations') {
        const vehicleName = relationData?.vehiculo_dominio || 'Vehículo desconocido';

        entry.changes.push({
          type: 'vehicle_relation',
          action: record.action_type === 'LINK' ? 'added' : 'removed',
          vehicle: {
            id: relationData?.vehiculo_id,
            domain: relationData?.vehiculo_dominio,
            internNumber: relationData?.vehiculo_numero_interno,
          },
        });

        entry.message = `${userName} ${action} el vehículo: ${vehicleName}`;
      }
    } else if (record.action_type === 'CREATE') {
      // Traducir los nombres de los campos para los registros CREATE
      const translatedData: Record<string, any> = {};

      if (record.changed_data) {
        Object.entries(record.changed_data).forEach(([key, value]) => {
          // Traducir nombres de campos
          switch (key) {
            case 'status':
              translatedData['Estado'] =
                value === 'pendiente'
                  ? 'Pendiente'
                  : value === 'ejecutado'
                    ? 'Ejecutado'
                    : value === 'cancelado'
                      ? 'Cancelado'
                      : value === 'reprogramado'
                        ? 'Reprogramado'
                        : value === 'sin_recursos_asignados'
                          ? 'Sin recursos asignados'
                          : value;
              break;
            case 'item_name':
              translatedData['Item'] = value;
              break;
            case 'working_day':
              translatedData['Jornada'] = value;
              break;
            case 'service_name':
              translatedData['Servicio'] = value;
              break;
            case 'type_service':
              translatedData['Tipo de servicio'] =
                value === 'mensual' ? 'Mensual' : value === 'adicional' ? 'Adicional' : value;
              break;
            case 'customer_name':
              translatedData['Cliente'] = value;
              break;
            case 'description':
              translatedData['Descripción'] = value;
              break;
            case 'remit_number':
              translatedData['Remito'] = value;
              break;
            case 'start_time':
              translatedData['Hora inicio'] = value;
              break;
            case 'end_time':
              translatedData['Hora fin'] = value;
              break;
            case 'cancel_reason':
              translatedData['Razón de cancelación'] = value;
              break;
            default:
              // Para campos no especificados, convertir de snake_case a formato título
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              translatedData[formattedKey] = value;
          }
        });
      }

      entry.changes.push({
        type: 'full_record',
        data: translatedData,
      });

      // Create Spanish message for new record
      const customerName = record.changed_data?.customer_name || '';
      const serviceName = record.changed_data?.service_name || '';
      const itemName = record.changed_data?.item_name || '';

      entry.message = `${userName} creó un nuevo registro para ${customerName} - ${serviceName} - ${itemName}`;
    } else if (record.action_type === 'DELETE') {
      // Traducir los nombres de los campos para los registros DELETE (misma lógica que para CREATE)
      const translatedData: Record<string, any> = {};

      if (record.changed_data) {
        Object.entries(record.changed_data).forEach(([key, value]) => {
          // Traducir nombres de campos
          switch (key) {
            case 'status':
              translatedData['Estado'] =
                value === 'pendiente'
                  ? 'Pendiente'
                  : value === 'ejecutado'
                    ? 'Ejecutado'
                    : value === 'cancelado'
                      ? 'Cancelado'
                      : value === 'reprogramado'
                        ? 'Reprogramado'
                        : value === 'sin_recursos_asignados'
                          ? 'Sin recursos asignados'
                          : value;
              break;
            case 'item_name':
              translatedData['Item'] = value;
              break;
            case 'working_day':
              translatedData['Jornada'] = value;
              break;
            case 'service_name':
              translatedData['Servicio'] = value;
              break;
            case 'type_service':
              translatedData['Tipo de servicio'] =
                value === 'mensual' ? 'Mensual' : value === 'adicional' ? 'Adicional' : value;
              break;
            case 'customer_name':
              translatedData['Cliente'] = value;
              break;
            case 'description':
              translatedData['Descripción'] = value;
              break;
            case 'remit_number':
              translatedData['Remito'] = value;
              break;
            case 'start_time':
              translatedData['Hora inicio'] = value;
              break;
            case 'end_time':
              translatedData['Hora fin'] = value;
              break;
            case 'cancel_reason':
              translatedData['Razón de cancelación'] = value;
              break;
            default:
              // Para campos no especificados, convertir de snake_case a formato título
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              translatedData[formattedKey] = value;
          }
        });
      }

      entry.changes.push({
        type: 'full_record',
        data: translatedData,
      });

      // Create Spanish message for deleted record
      const customerName = record.changed_data?.customer_name || '';
      const serviceName = record.changed_data?.service_name || '';
      const itemName = record.changed_data?.item_name || '';

      entry.message = `${userName} eliminó el registro para ${customerName} - ${serviceName} - ${itemName}`;
    }

    return entry;
  });

  // Sort by timestamp, newest first
  const sortedHistory = processedHistory?.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return sortedHistory || [];
}
export async function getDailyReportById(id: string) {
  const supabase = supabaseServer();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(
      `
      *,
      dailyreportrows(
        preparte(id, numero_pedido),
        *,
        dailyreport_customer_equipment_relations(
          *,
          equipos_clientes(*)
        ),
        id,
        service_sectors(*, sectors(*)),
        service_areas(*, areas_cliente(*)),
        customer_services(id, service_name),
        service_items(id, item_name),
        remit_number,
        customers(id, name),
        start_time,
        end_time,
        status,
        working_day,
        description,
        document_path,
        dailyreportemployeerelations(
          employees(
            id,
            firstname,
            lastname,
            document_number,
            phone,
            email,
            company_positions(name),
            contractor_employee(customers(name))
          )
        ),
        dailyreportequipmentrelations(
          vehicles(
            id,
            intern_number,
            domain,
            brand_vehicles(*),
            model_vehicles(*),
            model,
            year,
            sub_type(name),
            type(name),
            contractor_equipment(customers(name)),
            condition
          )
        )
      )
    `
    )
    .eq('id', id);
  if (error) {
    console.error('Error fetching daily reports:', error);
    return [];
  }
  return dailyReports || [];
}
export async function updateDailyReportStatusAndRemitNumber(
  id: string,
  data: { status: string; remit_number: string }
) {
  const supabase = supabaseServer();

  const { data: dato, error } = await supabase
    .from('dailyreportrows')
    .update({
      status: data.status as
        | 'pendiente'
        | 'sin_recursos_asignados'
        | 'ejecutado'
        | 'reprogramado'
        | 'cancelado'
        | '.'
        | '..'
        | 'en_certificacion'
        | undefined,
      remit_number: data.remit_number,
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating daily report status and remit number:', error);
    throw error;
  }

  return data;
}
export async function getDailyReportStatusById(id: string) {
  const supabase = supabaseServer();

  let { data: dailyReports, error } = await supabase.from('dailyreport').select('status,date').eq('id', id);

  if (error) {
    console.error('Error fetching daily reports:', error);
    return [];
  }

  return dailyReports || [];
}
export async function checkDailyReportExists(date: string[]) {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('dailyreport')
    .select('*')
    .in('date', date)
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');

  if (error) {
    console.error('Error checking daily reportsss:', error);
    return [];
  }

  return data;
}
export async function createDailyReport(date: string[]) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('dailyreport')
    .insert(
      date.map((date) => ({
        date,
        company_id: company_id || user?.app_metadata?.company_id || '',
      }))
    )
    .select();

  if (error) {
    console.error(error);
    return [];
  }
  return data;
}
export async function getCustomers() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('customers')
    .select(
      `
    *,
    equipos_clientes(*),
    customer_services!customer_services_customer_id_fkey(
      *,
      service_sectors(*, sectors(*) ),
      service_areas(*, areas_cliente(*)),
      service_items(*,measure_units(*))  
    )
  `
    )
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');
  if (error) {
    console.error(error);
  }

  return data;
}

export async function getCustomersServices() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('customer_services').select('*');
  if (error) {
    console.error(error);
  }
  return data;
}
export async function getServiceItems() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('service_items')
    .select('*,measure_units(*)')
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');
  if (error) {
    console.error(error);
  }
  return data;
}

export async function getActiveEmployeesForDailyReport() {
  const supabase = supabaseServer();

  // Obtener la fecha actual
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1; // Los meses en JS van de 0 a 11
  const year = today.getFullYear();

  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('employees')
    .select(
      'employees_diagram!inner(*,diagram_type(*)),contractor_employee(customers(id,name)),*,hierarchy(id,name),cities(id,name),provinces(id,name),empleado_aptitudes(aptitudes_tecnicas(nombre)),company_positions(*),work_diagram(id,name),cost_center(id,name)'
    )
    .eq('is_active', true)
    .or(`day.eq.${day},day.eq.${day + 1}`, { referencedTable: 'employees_diagram' })
    .eq('employees_diagram.month', month)
    .eq('employees_diagram.year', year)
    .eq('employees_diagram.diagram_type.work_active', true)
    .not('employees_diagram.diagram_type', 'is', null)
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');

  if (error) {
    console.error('Error al obtener empleados con diagrama:', error);
    return [];
  }

  return data || [];
}
export async function getActiveEquipmentsForDailyReport() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(id,name))'
    )
    .eq('is_active', true)
    .neq('condition', 'no operativo')
    .neq('condition', 'en reparacion')
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');
  if (error) {
    console.error('Error al obtener equipos activos:', error);
    return [];
  }
  return data || [];
}

// Tipos para las relaciones
interface EmployeeRelation {
  id: string;
  employee_id: string;
  daily_report_row_id: string;
  created_at?: string;
}

interface EquipmentRelation {
  id: string;
  equipment_id: string;
  daily_report_row_id: string;
  created_at?: string;
}

type DailyReportRowStatus = Database['public']['Enums']['daily_report_status'];
type DailyReportTypeEnum = Database['public']['Enums']['daily_report_type_enum'];

export interface DailyReportRowData {
  id?: string;
  daily_report_id: string | null;
  customer_id: string | null;
  service_id: string | null;
  item_id: string | null;
  working_day: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  areas_service_id?: string | null;
  sector_service_id?: string | null;
  type_service?: DailyReportTypeEnum | null;
  status: DailyReportRowStatus;
  document_path?: string | null;
  remit_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancel_reason?: string | null;
}
export async function updateDailyReportStatus(id: string, newStatus: string) {
  const supabase = supabaseServer();
  const { data: updatedRow, error: updateError } = await supabase
    .from('dailyreportrows')
    .update({
      status: newStatus as
        | 'pendiente'
        | 'sin_recursos_asignados'
        | 'ejecutado'
        | 'reprogramado'
        | 'cancelado'
        | '.'
        | '..'
        | 'en_certificacion'
        | undefined,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error al actualizar el estado de la fila:', updateError);
    throw updateError;
  }
  return updatedRow;
}

export async function updateDailyReportRow(
  id: string,
  data: Partial<DailyReportRowData>,
  employeeIds: string[],
  equipmentIds: string[],
  equipos_clienteIds: string[],
  {
    equipmentHasChanged = false,
    employeeHasChanged = false,
    reassignmentReason = '',
  }: { equipmentHasChanged: boolean; employeeHasChanged: boolean; reassignmentReason: string }
) {
  const supabase = supabaseServer();

  // Actualizar la fila principal
  await updateEmployeeRelations(id, employeeIds);

  // Actualizar relaciones de equipos
  await updateEquipmentRelations(id, equipmentIds);

  await updateEquiposClienteRelations(id, equipos_clienteIds);

  const { data: updatedRow, error: updateError } = await supabase
    .from('dailyreportrows')
    .update({
      ...data,
      status:
        data.status === 'cancelado' ||
        data.status === 'reprogramado' ||
        data.status === 'ejecutado' ||
        employeeIds.length > 0 ||
        equipmentIds.length > 0
          ? data.status
          : 'sin_recursos_asignados',
    })
    .eq('id', id)
    .select()
    .single();

  // Después de que se complete la actualización principal y modificaciones de relaciones
  if ((equipmentHasChanged || employeeHasChanged) && reassignmentReason) {
    try {
      // Obtener la hora actual menos algunos segundos para asegurarnos de capturar los cambios recientes
      const recientTimestamp = new Date();

      //espear de 1.5 segundos para que se guarde el historial
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Buscar registros relacionados con cambios en equipos o empleados para esta fila de reporte
      const { data: historyRecords } = await supabase
        .from('dailyreportrows_history')
        .select('id, daily_report_row_id, related_table, action_type, created_at, reassignment_reason')
        .eq('daily_report_row_id', id)
        .is('reassignment_reason', null)
        .eq('action_type', 'UNLINK');

      if (historyRecords && historyRecords.length > 0) {
        // Construir dinámicamente los filtros basados en qué ha cambiado
        let tablesToFilter = [];
        if (equipmentHasChanged) {
          tablesToFilter.push('dailyreportequipmentrelations');
        }
        if (employeeHasChanged) {
          tablesToFilter.push('dailyreportemployeerelations');
        }

        // Filtrar registros que involucran cambios en equipos o empleados según lo que haya cambiado
        // y que sean específicamente operaciones de LINK o UNLINK
        const recordsToUpdate = historyRecords.filter(
          (record) =>
            tablesToFilter.includes(record.related_table || '') &&
            (record.action_type === 'LINK' || record.action_type === 'UNLINK') &&
            !record.reassignment_reason
        );

        // Actualizar cada registro con la razón de reasignación
        if (recordsToUpdate.length > 0) {
          const updatePromises = recordsToUpdate.map((record) =>
            supabase
              .from('dailyreportrows_history')
              .update({ reassignment_reason: reassignmentReason })
              .eq('id', record.id)
          );

          await Promise.all(updatePromises);
        }
      } else {
      }
    } catch (error) {
      console.error('Error al actualizar la razón de reasignación:', error);
    }
  }
  if (updateError) {
    console.error('Error al actualizar la fila:', updateError);
    throw updateError;
  }
  // Actualizar relaciones de empleados

  return updatedRow;
}
export async function updateDailyReportRowBody(id: string, data: Partial<DailyReportRowData>) {
  const supabase = supabaseServer();

  const { data: updatedRow, error: updateError } = await supabase
    .from('dailyreportrows')
    .update({
      ...data,
      status:
        data.status === 'cancelado' || data.status === 'reprogramado' || data.status === 'ejecutado'
          ? data.status
          : 'sin_recursos_asignados',
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error al actualizar la fila:', updateError);
    throw updateError;
  }
  // Actualizar relaciones de empleados

  return updatedRow;
}

export async function updateDailyReportRowStatus(id: string[], status: DailyReportRowStatus) {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('dailyreportrows').update({ status }).in('id', id).select();

  if (error) {
    console.error('Error updating daily report row status:', error);
    throw error;
  }

  return data;
}

export async function updateEmployeeRelations(rowId: string, employeeIds: string[]) {
  const supabase = supabaseServer();

  try {
    // Obtener relaciones existentes
    const { data: existingRelations, error: fetchError } = await supabase
      .from('dailyreportemployeerelations' as any)
      .select('*')
      .eq('daily_report_row_id', rowId);

    if (fetchError) throw fetchError;

    const currentRelations = (existingRelations || []) as EmployeeRelation[];

    // Encontrar relaciones a eliminar
    const relationsToDelete = currentRelations.filter((rel) => !employeeIds.includes(rel.employee_id));

    // Encontrar empleados a agregar
    const existingEmployeeIds = currentRelations.map((rel) => rel.employee_id);
    const employeeIdsToAdd = employeeIds.filter((id) => !existingEmployeeIds.includes(id));

    // Eliminar relaciones
    if (relationsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('dailyreportemployeerelations' as any)
        .delete()
        .in(
          'id',
          relationsToDelete.map((r) => r.id)
        );

      if (deleteError) throw deleteError;
    }

    // Usar la función existente para crear nuevas relaciones
    if (employeeIdsToAdd.length > 0) {
      await createDailyReportEmployeeRelations(rowId, employeeIdsToAdd);
    }
  } catch (error) {
    console.error('Error en updateEmployeeRelations:', error);
    throw error;
  }
}

export async function updateEquipmentRelations(rowId: string, equipmentIds: string[]) {
  const supabase = supabaseServer();

  try {
    // Obtener relaciones existentes
    const { data: existingRelations, error: fetchError } = await supabase
      .from('dailyreportequipmentrelations' as any)
      .select('*')
      .eq('daily_report_row_id', rowId);

    if (fetchError) throw fetchError;

    const currentRelations = (existingRelations || []) as EquipmentRelation[];

    // Encontrar relaciones a eliminar
    const relationsToDelete = currentRelations.filter((rel) => !equipmentIds.includes(rel.equipment_id));

    // Encontrar equipos a agregar
    const existingEquipmentIds = currentRelations.map((rel) => rel.equipment_id);
    const equipmentIdsToAdd = equipmentIds.filter((id) => !existingEquipmentIds.includes(id));

    // Eliminar relaciones
    if (relationsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('dailyreportequipmentrelations')
        .delete()
        .in(
          'id',
          relationsToDelete.map((r) => r.id)
        );

      if (deleteError) throw deleteError;
    }

    // Usar la función existente para crear nuevas relaciones
    if (equipmentIdsToAdd.length > 0) {
      await createDailyReportEquipmentRelations(rowId, equipmentIdsToAdd);
    }
  } catch (error) {
    console.error('Error en updateEquipmentRelations:', error);
    throw error;
  }
}

export async function updateEquiposClienteRelations(dailyReportRowId: string, equiposClienteIds: string[]) {
  const supabase = supabaseServer();

  try {
    // 1. Obtener relaciones existentes para este daily_report_row
    const { data: existingRelations, error: fetchError } = await supabase
      .from('dailyreport_customer_equipment_relations')
      .select('id, customer_equipment_id')
      .eq('daily_report_row_id', dailyReportRowId);

    if (fetchError) throw fetchError;

    const currentRelations = existingRelations || [];

    // 2. Identificar relaciones a eliminar (están en la BD pero no en los nuevos IDs)
    const currentEquipmentIds = currentRelations.map((rel) => rel.customer_equipment_id);
    const newEquipmentIds = equiposClienteIds || [];

    const relationsToDelete = currentRelations.filter((rel) => !newEquipmentIds.includes(rel.customer_equipment_id));

    // 3. Identificar equipos para los que hay que crear nuevas relaciones
    const equipmentIdsToAdd = newEquipmentIds.filter((id) => !currentEquipmentIds.includes(id));

    // 4. Eliminar relaciones que ya no existen
    if (relationsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('dailyreport_customer_equipment_relations')
        .delete()
        .in(
          'id',
          relationsToDelete.map((r) => r.id)
        );

      if (deleteError) throw deleteError;
    }

    // 5. Crear nuevas relaciones para equipos que no las tenían
    if (equipmentIdsToAdd.length > 0) {
      const newRelations = equipmentIdsToAdd.map((equipmentId) => ({
        daily_report_row_id: dailyReportRowId,
        customer_equipment_id: equipmentId,
      }));

      const { error: insertError } = await supabase
        .from('dailyreport_customer_equipment_relations')
        .insert(newRelations);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error en updateEquiposClienteRelations:', error);
    throw error;
  }
}
export async function createDailyReportRow(data: Omit<DailyReportRowData, 'id' | 'created_at' | 'updated_at'>[]) {
  const supabase = supabaseServer();

  try {
    // Insertar todas las filas a la vez
    const { data: createdRows, error } = await supabase.from('dailyreportrows').insert(data).select('*');

    if (error) {
      console.error(error, 'error');
      throw error;
    }

    // Verificar que se hayan creado las filas
    if (!createdRows || createdRows.length === 0) {
      throw new Error('No se crearon filas');
    }

    return createdRows;
  } catch (error) {
    console.error('Error creando filas de parte diario:', error);
    throw error;
  }
}

export async function createDailyReportEmployeeRelations(dailyReportRowId: string, employeeIds: string[]) {
  if (!employeeIds || employeeIds.length === 0) return [];

  const supabase = supabaseServer();

  const relations = employeeIds.map((employeeId) => ({
    daily_report_row_id: dailyReportRowId,
    employee_id: employeeId,
  }));

  const { data, error } = await supabase.from('dailyreportemployeerelations').insert(relations).select();

  if (error) {
    console.error('Error creating employee relations:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function deleteDailyReportRow(id: string) {
  const supabase = supabaseServer();

  try {
    // Finalmente eliminamos la fila del reporte
    const { error: rowError } = await supabase.from('dailyreportrows').delete().eq('id', id);

    if (rowError) throw rowError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting daily report row:', error);
    throw error;
  }
}

export async function createDailyReportEquipmentRelations(dailyReportRowId: string, equipmentIds: string[]) {
  if (!equipmentIds || equipmentIds.length === 0) return [];

  const supabase = supabaseServer();

  const relations = equipmentIds.map((equipmentId) => ({
    daily_report_row_id: dailyReportRowId,
    equipment_id: equipmentId,
  }));

  const { data, error } = await supabase
    .from('dailyreportequipmentrelations' as any)
    .insert(relations)
    .select();

  if (error) {
    console.error('Error creating equipment relations:', error);
    throw new Error(error.message);
  }

  return data || [];
}
export async function createDailyReportCustomerEquipmentRelations(dailyReportRowId: string, equipmentIds: string[]) {
  if (!equipmentIds || equipmentIds.length === 0) return [];

  const supabase = supabaseServer();

  const relations = equipmentIds.map((equipmentId) => ({
    daily_report_row_id: dailyReportRowId,
    customer_equipment_id: equipmentId,
  }));

  const { data, error } = await supabase.from('dailyreport_customer_equipment_relations').insert(relations).select();

  if (error) {
    console.error('Error creating equipment customers relations:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function getCustomersAreas(customerIds: string[]) {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('areas_cliente').select('*').in('customer_id', customerIds);
  if (error) {
    return [];
  }
  return data;
}
export async function getCustomersSectors(customerIds: string[]) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('sector_customer')
    .select('*,customers(*),sectors(*)')
    .in('customer_id', customerIds);
  if (error) {
    console.error(error);
    return [];
  }
  return data;
}

/**
 * Elimina un parte diario si está completamente vacío (no tiene filas asociadas)
 * @param reportId ID del parte diario a eliminar
 * @returns Objeto con estado de la operación y mensaje
 */
export async function deleteDailyReport(reportId: string) {
  const supabase = supabaseServer();

  try {
    // Primero verificar que no tenga filas asociadas
    const { data: rows, error: rowsError } = await supabase
      .from('dailyreportrows')
      .select('id')
      .eq('daily_report_id', reportId);

    if (rowsError) {
      console.error('Error verificando filas del parte diario:', rowsError);
      return { success: false, message: 'Error al verificar si el parte diario está vacío' };
    }

    // Si tiene filas, no permitir la eliminación
    if (rows && rows.length > 0) {
      return { success: false, message: 'No se puede eliminar un parte diario que contiene registros' };
    }

    // Si no tiene filas, eliminar el parte diario
    const { error: deleteError } = await supabase.from('dailyreport').delete().eq('id', reportId);

    if (deleteError) {
      console.error('Error eliminando parte diario:', deleteError);
      return { success: false, message: 'Error al eliminar el parte diario' };
    }

    return { success: true, message: 'Parte diario eliminado correctamente' };
  } catch (error) {
    console.error('Error en la función deleteDailyReport:', error);
    return { success: false, message: 'Error inesperado al procesar la solicitud' };
  }
}

export interface DailyReportWithRows {
  id: string;
  date: string;
  company_id: string;
  status: string;
  dailyreportrows: {
    id: string;
    item_id: { id: string; item_name: string } | null;
    customer_id: { id: string; name: string } | null;
    service_id: { id: string; service_name: string } | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
    description: string | null;
    document_path: string | null;
    dailyreportemployeerelations: {
      employee_id: { id: string; firstname: string; lastname: string };
    }[];
    dailyreportequipmentrelations: {
      equipment_id: { id: string; domain: string };
    }[];
  }[];
}

export async function getDailyReportsWithRows(): Promise<DailyReportWithRows[]> {
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!company_id && !user?.app_metadata?.company_id) {
    throw new Error('No se pudo determinar la compañía');
  }

  const PAGE_SIZE = 1000; // Número de registros por página
  let allDailyReports: any[] = [];
  let page = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const {
        data: dailyReports,
        error,
        count,
      } = await supabase
        .from('dailyreport')
        .select(
          `
          id,
          date,
          company_id,
          status,
          dailyreportrows (
            id,
            item_id(id, item_name),
            customer_id(id, name),
            service_id(id, service_name),
            start_time,
            end_time,
            status,
            description,
            document_path,
            dailyreportemployeerelations (employee_id(id, firstname, lastname)),
            dailyreportequipmentrelations (equipment_id(id, domain))
          )
        `,
          { count: 'exact' }
        )
        .eq('company_id', company_id || '')
        .order('date', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error al obtener los reportes diarios con filas (página ${page + 1}):', error);
        throw new Error(`Error al obtener los reportes diarios: ${error.message}`);
      }

      if (dailyReports && dailyReports.length > 0) {
        allDailyReports = [...allDailyReports, ...dailyReports];
      }

      // Verificar si hay más páginas por cargar
      hasMore = dailyReports?.length === PAGE_SIZE;
      page++;

      // Pequeña pausa para no saturar el servidor
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allDailyReports as any[];
  } catch (error) {
    console.error('Error en getDailyReportsWithRows:', error);
    throw error;
  }
}

// Interfaces para el gráfico de servicios
export interface ServicesSummary {
  type_service: string;
  count: number;
  percentage: number;
}

export async function getDailyReportsLatest() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(`id,date,dailyreportrows(*,customers(id,name))`)
    .gte('date', moment().startOf('month').format('YYYY-MM-DD'))
    .lte('date', moment().endOf('month').format('YYYY-MM-DD'))
    .order('date', { ascending: false })
    .eq('company_id', company_id || user?.app_metadata?.company_id || '');

  if (error) {
    console.error('Error fetching daily reports:', error);
    return [];
  }

  return dailyReports || [];
}

export type getDailyReportsLatestType = Awaited<ReturnType<typeof getDailyReportsLatest>>;

/**
 * Obtiene el resumen de servicios por tipo de operación
 * Llama a la función RPC get_services_summary_by_type
 */
export async function getServicesSummaryByType(saveToHistory?: boolean) {
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!company_id && !user?.app_metadata?.company_id) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_services_summary_by_type', {
      p_company_id: company_id || user?.app_metadata?.company_id || '',
      save_to_history: saveToHistory || false,
    });

    if (error) {
      console.error('Error fetching services summary aactual:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getServicesSummaryByType:', error);
    return [];
  }
}

/**
 * Obtiene el resumen de servicios por tipo con filtros de fecha
 * Llama a la función RPC get_services_summary_by_type_with_dates
 */
// export async function getServicesSummaryByTypeWithDates(
//   fromDate: string,
//   toDate: string,
//   saveToHistory?: boolean
// ): Promise<ServicesSummary[]> {
//   const cookieStore = cookies();
//   const company_id = cookieStore.get('actualComp')?.value;
//   const supabase = supabaseServer();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!company_id && !user?.app_metadata?.company_id) {
//     return [];
//   }

//   try {
//     const { data, error } = await supabase.rpc('get_services_summary_by_type_with_dates', {
//       p_company_id: company_id || user?.app_metadata?.company_id || '',
//       p_from_date: fromDate,
//       p_to_date: toDate,
//       save_to_history: saveToHistory || false
//     });

//     if (error) {
//       console.error('Error fetching services summary with dates:', error);
//       return [];
//     }

//     return data || [];
//   } catch (error) {
//     console.error('Error in getServicesSummaryByTypeWithDates:', error);
//     return [];
//   }
// }

/**
 * Interfaz para el detalle de servicios por cliente
 */
export interface ServiceDetailByClient {
  client_name: string;
  mensual_count: number;
  adicional_count: number;
  total_count: number;
  status_distribution: {
    status: string;
    count: number;
  }[];
}

/**
 * Obtiene el detalle de servicios por cliente para el día actual
 * Incluye distribución de servicios mensuales, adicionales y estados
 */
export async function getServicesDetailByClient(): Promise<ServiceDetailByClient[]> {
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!company_id && !user?.app_metadata?.company_id) {
    return [];
  }

  try {
    const today = moment().format('YYYY-MM-DD');

    // Consulta para obtener los datos detallados por cliente
    const { data, error } = await supabase
      .from('dailyreportrows')
      .select(
        `
        customer_id!inner(
          id,
          name
        ),
        type_service,
        status,
        daily_report_id!inner(
          date,
          company_id
        )
      `
      )
      .eq('daily_report_id.company_id', company_id || user?.app_metadata?.company_id || '')
      .eq('daily_report_id.date', today);

    if (error) {
      console.error('Error fetching services detail by client:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Procesar los datos para agrupar por cliente
    const clientsMap = new Map<
      string,
      {
        client_name: string;
        mensual_count: number;
        adicional_count: number;
        status_counts: Map<string, number>;
      }
    >();

    data.forEach((row: any) => {
      const clientId = row.customer_id.id;
      const clientName = row.customer_id.name;
      const typeService = row.type_service || 'sin_tipo';
      const status = row.status;

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          client_name: clientName,
          mensual_count: 0,
          adicional_count: 0,
          status_counts: new Map<string, number>(),
        });
      }

      const client = clientsMap.get(clientId)!;

      // Contar por tipo de servicio
      if (typeService === 'mensual') {
        client.mensual_count++;
      } else if (typeService === 'adicional' || typeService === 'adicional_permanente') {
        client.adicional_count++;
      }

      // Contar por estado
      const currentStatusCount = client.status_counts.get(status) || 0;
      client.status_counts.set(status, currentStatusCount + 1);
    });

    // Convertir el Map a array con el formato requerido
    const result: ServiceDetailByClient[] = Array.from(clientsMap.values()).map((client) => ({
      client_name: client.client_name,
      mensual_count: client.mensual_count,
      adicional_count: client.adicional_count,
      total_count: client.mensual_count + client.adicional_count,
      status_distribution: Array.from(client.status_counts.entries()).map(([status, count]) => ({
        status,
        count,
      })),
    }));

    // Ordenar por total de servicios descendente
    return result.sort((a, b) => b.total_count - a.total_count);
  } catch (error) {
    console.error('Error in getServicesDetailByClient:', error);
    return [];
  }
}
