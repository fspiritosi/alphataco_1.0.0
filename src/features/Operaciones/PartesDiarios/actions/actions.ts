'use server';
import { DailyReportRowHistoryRecord, ProcessedHistoryEntry } from '@/app/server/colections';
import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';
import { cookies } from 'next/headers';

// Función para actualizar el estado de múltiples partes diarios (bulk update)
export async function updateMultipleDailyReportStatus(ids: string[], status: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('dailyreport')
    .update({
      status: status as 'abierto' | 'cerrado' | 'cerrado_incompleto',
    })
    .in('id', ids)
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

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
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!company_id && !user?.app_metadata?.company) {
    return [];
  }

  let query = supabase
    .from('dailyreport')
    .select(`*,dailyreportrows(status)`)
    .order('date', { ascending: false })
    .eq('company_id', company_id || user?.app_metadata?.company || '');

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
    logger.error('Error fetching daily reports', { data: { error } });
    throw error;
  }

  return data;
}
export async function getDailyReports() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(`*,dailyreportrows(status)`)
    .order('date', { ascending: false })
    .eq('company_id', company_id || user?.app_metadata?.company || '');

  if (error) {
    logger.error('Error fetching daily reports', { data: { error } });
    return [];
  }

  return dailyReports || [];
}
export async function getDailyReportsForCurrentMonth() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
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
    .eq('company_id', company_id || user?.app_metadata?.company || '');

  if (error) {
    logger.error('Error fetching daily reports', { data: { error } });
    return [];
  }

  return dailyReports || [];
}

export async function getDailyReportRowHistory(dailyReportId: string) {
  const supabase = await supabaseServer();
  const { data: history, error } = await supabase
    .rpc('get_dailyreportrow_history', { p_row_id: dailyReportId })
    .returns<DailyReportRowHistoryRecord[]>();

  //Verifciar si la row pertenece a algun preparte
  const { data: preparteData, error: error2 } = await supabase
    .from('dailyreportrows')
    .select('preparte(id,numero_pedido)')
    .eq('id', dailyReportId);
  if (error2) {
    logger.error('Error fetching daily report row history', { data: { error: error2 } });
    return [];
  }

  if (error) {
    logger.error('Error fetching daily report row history', { data: { error } });
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
export async function getDailyReportByIdOnlyDate(id: string) {
  const supabase = await supabaseServer();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(
      `
      date
    
    `
    )
    .eq('id', id)
    .limit(1)
    .single();
  if (error) {
    logger.error('Error fetching daily reports', { data: { error } });
    return null;
  }
  return dailyReports;
}
export async function getDailyReportById(id: string) {
  const supabase = await supabaseServer();

  let { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(
      `
      *,
      dailyreportrows(
        preparte(id, numero_pedido,confirmed_by),
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
          role,
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
    logger.error('Error fetching daily reports', { data: { error } });
    return [];
  }
  return dailyReports || [];
}
export async function updateDailyReportStatusAndRemitNumber(
  id: string,
  data: { status: string; remit_number: string }
) {
  const supabase = await supabaseServer();

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
    logger.error('Error updating daily report status and remit number', { data: { error } });
    throw error;
  }

  return data;
}
export async function getDailyReportStatusById(id: string) {
  const supabase = await supabaseServer();

  let { data: dailyReports, error } = await supabase.from('dailyreport').select('status,date').eq('id', id);

  if (error) {
    logger.error('Error fetching daily reports', { data: { error } });
    return [];
  }

  return dailyReports || [];
}
export async function checkDailyReportExists(date: string[]) {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('dailyreport')
    .select('*')
    .in('date', date)
    .eq('company_id', company_id || user?.app_metadata?.company || '');

  if (error) {
    logger.error('Error checking daily reports', { data: { error } });
    return [];
  }

  return data;
}
export async function createDailyReport(date: string[]) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('dailyreport')
    .insert(
      date.map((date) => ({
        date,
        company_id: company_id || user?.app_metadata?.company || '',
      }))
    )
    .select();

  if (error) {
    logger.error('Error creating daily report', { data: { error } });
    return [];
  }
  return data;
}
export async function getCustomers() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
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
    .eq('company_id', company_id || user?.app_metadata?.company || '');
  if (error) {
    logger.error('Error fetching customers', { data: { error } });
  }

  return data;
}

export async function getCustomersServices() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('customer_services').select('*');
  if (error) {
    logger.error('Error fetching customer services', { data: { error } });
  }
  return data;
}
export async function getServiceItems() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('service_items')
    .select('*,measure_units(*)')
    .eq('company_id', company_id || user?.app_metadata?.company || '');
  if (error) {
    logger.error('Error fetching service items', { data: { error } });
  }
  return data;
}

export async function getActiveEmployeesForDailyReport() {
  const supabase = await supabaseServer();

  // Obtener la fecha actual
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1; // Los meses en JS van de 0 a 11
  const year = today.getFullYear();

  const cookiesStore = await cookies();
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
    .eq('company_id', company_id || user?.app_metadata?.company || '');

  if (error) {
    logger.error('Error al obtener empleados con diagrama', { data: { error } });
    return [];
  }

  return data || [];
}

/**
 * Obtiene TODOS los empleados activos SIN restricción de diagrama.
 * Incluye información del diagrama para detectar desvíos visualmente.
 * @param reportDate Fecha del parte diario (formato YYYY-MM-DD) para verificar el diagrama
 */
export async function getAllActiveEmployeesForDailyReport(reportDate?: string) {
  const supabase = await supabaseServer();

  // Usar la fecha proporcionada o la fecha actual
  const dateToCheck = reportDate ? new Date(reportDate) : new Date();
  const day = dateToCheck.getDate();
  const month = dateToCheck.getMonth() + 1;
  const year = dateToCheck.getFullYear();

  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener TODOS los empleados activos (sin filtro de diagrama)
  const { data: employees, error } = await supabase
    .from('employees')
    .select(
      'contractor_employee(customers(id,name)),*,hierarchy(id,name),cities(id,name),provinces(id,name),empleado_aptitudes(aptitudes_tecnicas(nombre)),company_positions(*),work_diagram(id,name),cost_center(id,name)'
    )
    .eq('is_active', true)
    .eq('company_id', company_id || user?.app_metadata?.company || '');

  if (error) {
    logger.error('Error al obtener todos los empleados activos', { data: { error } });
    return [];
  }

  if (!employees || employees.length === 0) {
    return [];
  }

  // Obtener los diagramas de todos los empleados para el día especificado
  const employeeIds = employees.map((e) => e.id);
  const { data: diagrams, error: diagramError } = await supabase
    .from('employees_diagram')
    .select('*, diagram_type(*)')
    .in('employee_id', employeeIds)
    .eq('day', day)
    .eq('month', month)
    .eq('year', year)
    .eq('is_active', true);

  if (diagramError) {
    logger.error('Error al obtener diagramas de empleados', { data: { error: diagramError } });
  }

  // Crear un mapa de diagramas por empleado
  type DiagramType = NonNullable<typeof diagrams>[number];
  const diagramMap = new Map<string, DiagramType>();
  diagrams?.forEach((d) => {
    if (d.employee_id) {
      diagramMap.set(d.employee_id, d);
    }
  });

  // Agregar información de desvío a cada empleado
  const employeesWithDeviations = employees.map((employee) => {
    const diagram = diagramMap.get(employee.id);
    const hasDiagram = !!diagram;
    const isWorkDay = diagram?.diagram_type?.work_active === true;

    return {
      ...employee,
      // Información del diagrama para este día
      current_diagram: diagram || null,
      // Flags de desvío
      deviation_no_diagram: !hasDiagram,
      deviation_non_work_day: hasDiagram && !isWorkDay,
      deviation_type: !hasDiagram ? 'sin_diagrama' : !isWorkDay ? 'dia_no_laboral' : null,
    };
  });

  return employeesWithDeviations;
}
export async function getActiveEquipmentsForDailyReport() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
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
    .eq('company_id', company_id || user?.app_metadata?.company || '');
  if (error) {
    logger.error('Error al obtener equipos activos', { data: { error } });
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
  const supabase = await supabaseServer();
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
    logger.error('Error al actualizar el estado de la fila', { data: { error: updateError } });
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
  const supabase = await supabaseServer();

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
      logger.error('Error al actualizar la razón de reasignación', { data: { error } });
    }
  }
  if (updateError) {
    logger.error('Error al actualizar la fila', { data: { error: updateError } });
    throw updateError;
  }
  // Actualizar relaciones de empleados

  return updatedRow;
}
export async function updateDailyReportRowBody(id: string, data: Partial<DailyReportRowData>) {
  const supabase = await supabaseServer();

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
    logger.error('Error al actualizar la fila', { data: { error: updateError } });
    throw updateError;
  }
  // Actualizar relaciones de empleados

  return updatedRow;
}

export async function updateDailyReportRowStatus(id: string[], status: DailyReportRowStatus) {
  const supabase = await supabaseServer();

  const updateData: any = { status };

  const { data, error } = await supabase.from('dailyreportrows').update(updateData).in('id', id).select();

  if (error) {
    logger.error('Error updating daily report row status', { data: { error } });
    throw error;
  }

  return data;
}

export async function updateEmployeeRelations(rowId: string, employeeIds: string[]) {
  const supabase = await supabaseServer();

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
    logger.error('Error en updateEmployeeRelations', { data: { error } });
    throw error;
  }
}

export async function updateEquipmentRelations(rowId: string, equipmentIds: string[]) {
  const supabase = await supabaseServer();

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
    logger.error('Error en updateEquipmentRelations', { data: { error } });
    throw error;
  }
}

export async function updateEquiposClienteRelations(dailyReportRowId: string, equiposClienteIds: string[]) {
  const supabase = await supabaseServer();

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
    logger.error('Error en updateEquiposClienteRelations', { data: { error } });
    throw error;
  }
}
export async function createDailyReportRow(data: Omit<DailyReportRowData, 'id' | 'created_at' | 'updated_at'>[]) {
  const supabase = await supabaseServer();

  // Aumentar timeout para operaciones masivas
  if (data.length > 50) {
    supabase.realtime.setAuth(null); // Deshabilitar realtime temporalmente
  }

  try {
    // Para lotes grandes (>50), procesar en chunks para evitar timeouts
    if (data.length > 50) {
      const chunkSize = 25;
      const chunks = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      const allCreatedRows = [];
      for (const chunk of chunks) {
        const { data: createdRows, error } = await supabase.from('dailyreportrows').insert(chunk).select('*');

        if (error) {
          logger.error('Error en chunk al crear filas de parte diario', { data: { error } });
          throw error;
        }

        if (createdRows) {
          allCreatedRows.push(...createdRows);
        }

        // Pequeña pausa entre chunks para evitar sobrecarga
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return allCreatedRows;
    } else {
      // Para lotes pequeños, insertar normalmente
      const { data: createdRows, error } = await supabase.from('dailyreportrows').insert(data).select('*');

      if (error) {
        logger.error('Error al crear filas de parte diario', { data: { error } });
        throw error;
      }

      // Verificar que se hayan creado las filas
      if (!createdRows || createdRows.length === 0) {
        throw new Error('No se crearon filas');
      }

      return createdRows;
    }
  } catch (error) {
    logger.error('Error creando filas de parte diario', { data: { error } });
    throw error;
  }
}

export async function createDailyReportEmployeeRelations(dailyReportRowId: string, employeeIds: string[]) {
  if (!employeeIds || employeeIds.length === 0) return [];

  const supabase = await supabaseServer();

  const relations = employeeIds.map((employeeId) => ({
    daily_report_row_id: dailyReportRowId,
    employee_id: employeeId,
  }));

  const { data, error } = await supabase.from('dailyreportemployeerelations').insert(relations).select();

  if (error) {
    logger.error('Error creating employee relations', { data: { error } });
    throw new Error(error.message);
  }

  return data || [];
}

// Tipo para empleados con rol
export type EmployeeWithRole = {
  employeeId: string;
  role: 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche';
};

// Crear relaciones de empleados con roles (para jornadas 12/24 hrs)
export async function createDailyReportEmployeeRelationsWithRoles(
  dailyReportRowId: string,
  employeesWithRoles: EmployeeWithRole[]
) {
  if (!employeesWithRoles || employeesWithRoles.length === 0) return [];

  const supabase = await supabaseServer();

  const relations = employeesWithRoles.map((emp) => ({
    daily_report_row_id: dailyReportRowId,
    employee_id: emp.employeeId,
    role: emp.role,
  }));

  const { data, error } = await supabase.from('dailyreportemployeerelations').insert(relations).select();

  if (error) {
    logger.error('Error creating employee relations with roles', { data: { error } });
    throw new Error(error.message);
  }

  return data || [];
}

// Actualizar relaciones de empleados con roles
export async function updateEmployeeRelationsWithRoles(rowId: string, employeesWithRoles: EmployeeWithRole[]) {
  const supabase = await supabaseServer();

  try {
    // Eliminar todas las relaciones existentes
    const { error: deleteError } = await supabase
      .from('dailyreportemployeerelations')
      .delete()
      .eq('daily_report_row_id', rowId);

    if (deleteError) throw deleteError;

    // Crear nuevas relaciones con roles
    if (employeesWithRoles.length > 0) {
      await createDailyReportEmployeeRelationsWithRoles(rowId, employeesWithRoles);
    }
  } catch (error) {
    logger.error('Error en updateEmployeeRelationsWithRoles', { data: { error } });
    throw error;
  }
}

export async function deleteDailyReportRow(id: string) {
  const supabase = await supabaseServer();

  try {
    // Finalmente eliminamos la fila del reporte
    const { error: rowError } = await supabase.from('dailyreportrows').delete().eq('id', id);

    if (rowError) throw rowError;

    return { success: true };
  } catch (error) {
    logger.error('Error deleting daily report row', { data: { error } });
    throw error;
  }
}

export async function createDailyReportEquipmentRelations(dailyReportRowId: string, equipmentIds: string[]) {
  if (!equipmentIds || equipmentIds.length === 0) return [];

  const supabase = await supabaseServer();

  const relations = equipmentIds.map((equipmentId) => ({
    daily_report_row_id: dailyReportRowId,
    equipment_id: equipmentId,
  }));

  const { data, error } = await supabase
    .from('dailyreportequipmentrelations' as any)
    .insert(relations)
    .select();

  if (error) {
    logger.error('Error creating equipment relations', { data: { error } });
    throw new Error(error.message);
  }

  return data || [];
}
export async function createDailyReportCustomerEquipmentRelations(dailyReportRowId: string, equipmentIds: string[]) {
  if (!equipmentIds || equipmentIds.length === 0) return [];

  const supabase = await supabaseServer();

  const relations = equipmentIds.map((equipmentId) => ({
    daily_report_row_id: dailyReportRowId,
    customer_equipment_id: equipmentId,
  }));

  const { data, error } = await supabase.from('dailyreport_customer_equipment_relations').insert(relations).select();

  if (error) {
    logger.error('Error creating equipment customers relations', { data: { error } });
    throw new Error(error.message);
  }

  return data || [];
}

export async function getCustomersAreas(customerIds: string[]) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('areas_cliente').select('*').in('customer_id', customerIds);
  if (error) {
    return [];
  }
  return data;
}
export async function getCustomersSectors(customerIds: string[]) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('sector_customer')
    .select('*,customers(*),sectors(*)')
    .in('customer_id', customerIds);
  if (error) {
    logger.error('Error fetching customer sectors', { data: { error } });
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
  const supabase = await supabaseServer();

  try {
    // Primero verificar que no tenga filas asociadas
    const { data: rows, error: rowsError } = await supabase
      .from('dailyreportrows')
      .select('id')
      .eq('daily_report_id', reportId);

    if (rowsError) {
      logger.error('Error verificando filas del parte diario', { data: { error: rowsError } });
      return { success: false, message: 'Error al verificar si el parte diario está vacío' };
    }

    // Si tiene filas, no permitir la eliminación
    if (rows && rows.length > 0) {
      return { success: false, message: 'No se puede eliminar un parte diario que contiene registros' };
    }

    // Si no tiene filas, eliminar el parte diario
    const { error: deleteError } = await supabase.from('dailyreport').delete().eq('id', reportId);

    if (deleteError) {
      logger.error('Error eliminando parte diario', { data: { error: deleteError } });
      return { success: false, message: 'Error al eliminar el parte diario' };
    }

    return { success: true, message: 'Parte diario eliminado correctamente' };
  } catch (error) {
    logger.error('Error en la función deleteDailyReport', { data: { error } });
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
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!company_id && !user?.app_metadata?.company) {
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
        logger.error('Error al obtener los reportes diarios con filas', { data: { error, page: page + 1 } });
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
    logger.error('Error en getDailyReportsWithRows', { data: { error } });
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
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
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
    .eq('company_id', company_id || user?.app_metadata?.company || '');

  if (error) {
    logger.error('Error fetching daily reports', { data: { error } });
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
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!company_id && !user?.app_metadata?.company) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_services_summary_by_type', {
      p_company_id: company_id || user?.app_metadata?.company || '',
      save_to_history: saveToHistory || false,
    });

    if (error) {
      logger.error('Error fetching services summary', { data: { error } });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getServicesSummaryByType', { data: { error } });
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
//   const supabase = await supabaseServer();
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
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!company_id && !user?.app_metadata?.company) {
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
      .eq('daily_report_id.company_id', company_id || user?.app_metadata?.company || '')
      .eq('daily_report_id.date', today);

    if (error) {
      logger.error('Error fetching services detail by client', { data: { error } });
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
    logger.error('Error in getServicesDetailByClient', { data: { error } });
    return [];
  }
}

// Tipos exportados
export type EmployeeWithDeviations = Awaited<ReturnType<typeof getAllActiveEmployeesForDailyReport>>[number];
