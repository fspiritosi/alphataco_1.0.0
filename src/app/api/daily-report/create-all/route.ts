// api/daily-report/create.ts
import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = supabaseServer();

  try {
    // Datos recibidos del frontend
    const { date, status, company_id, editingId, rows, employees, equipment } = await request.json();

    let dailyReportId = editingId;

    // Si no existe `editingId`, estamos creando un nuevo parte diario
    if (!editingId) {
      if (!date) {
        throw new Error('La fecha es obligatoria para crear el parte diario.');
      }

      // Verificar si ya existe un parte diario con esa fecha
      const { data: existingReports, error: existingReportsError } = await supabase
        .from('dailyreport' as any)
        .select('id')
        .eq('date', date);

      if (existingReportsError) {
        throw new Error(`Error al validar la fecha: ${existingReportsError.message}`);
      }

      if (existingReports?.length > 0) {
        throw new Error(`Ya existe un parte diario con la fecha ${date}`);
      }

      // Crear el Parte Diario
      const { data, error } = await supabase
        .from('dailyreport' as any)
        .insert([{ date, status, company_id }])
        .select();

      if (error || !data || data?.length === 0) {
        throw new Error(`Error creando parte diario: ${error?.message || 'No se pudo crear el parte diario'}`);
      }

      dailyReportId = data[0].id;
    } else {
      // Si `editingId` está presente, actualizar el parte diario existente
      const { data, error } = await supabase
        .from('dailyreport' as any)
        .update({ status, company_id })
        .eq('id', editingId)
        .select();

      if (error || !data || data?.length === 0) {
        throw new Error(`Error editando parte diario: ${error?.message || 'No se pudo editar el parte diario'}`);
      }

      dailyReportId = data[0].id;
    }
    // 2. Insertar filas en la tabla dailyReportRow
    let dailyReportRowIds: string[] = []; // Inicializar un array para los IDs de las filas
    if (rows) {
      const rowsToInsert = {
        daily_report_id: dailyReportId,
        customer_id: rows.customer_id,
        service_id: rows.service_id,
        item_id: rows.item_id,
        start_time: rows.start_time,
        end_time: rows.end_time,
        // status: "pendiente",
        // description: rows.description,
      };
      const { data: rowData, error: rowInsertError } = await supabase
        .from('dailyreportrow' as any)
        .insert(rowsToInsert)
        .select();

      if (rowInsertError || !rowData) {
        throw new Error(
          `Error insertando filas en dailyreportrow: ${rowInsertError?.message || 'No se pudo insertar filas'}`
        );
      }

      // Obtener todos los IDs de las filas insertadas
      dailyReportRowIds = rowData.map((row) => row.id); // Almacenar todos los IDs
    }

    // 3. Relacionar empleados en dailyReportEmployeeRelations
    if (employees && employees?.length > 0) {
      const employeeRelations = employees.flatMap((employee: { id: any }) =>
        dailyReportRowIds.map((rowId) => ({
          daily_report_row_id: rowId,
          employee_id: employee.id,
        }))
      );

      const { error: employeeInsertError } = await supabase
        .from('dailyreportemployeerelations' as any)
        .insert(employeeRelations);

      if (employeeInsertError) {
        throw new Error(`Error insertando relaciones de empleados: ${employeeInsertError.message}`);
      }
    }

    // 4. Relacionar equipos en dailyReportEquipmentRelations
    if (equipment && equipment?.length > 0) {
      const equipmentRelations = equipment.flatMap((equip: { id: any }) =>
        dailyReportRowIds.map((rowId) => ({
          daily_report_row_id: rowId, // Usa el ID de la fila correspondiente
          equipment_id: equip.id,
        }))
      );

      const { error: equipmentInsertError } = await supabase
        .from('dailyreportequipmentrelations' as any)
        .insert(equipmentRelations);

      if (equipmentInsertError) {
        throw new Error(`Error insertando relaciones de equipos: ${equipmentInsertError.message}`);
      }
    }

    // Responder con éxito
    return NextResponse.json(
      {
        message: editingId ? 'Parte diario editado exitosamente' : 'Parte diario creado exitosamente',
        report_id: dailyReportId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error procesando el parte diario:', error);
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
