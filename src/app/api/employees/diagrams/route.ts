import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = supabaseServer();
  const searchParams = request.nextUrl.searchParams;
  const company_id = searchParams.get('actual');
  const user_id = searchParams.get('user');
  const employee_id = searchParams.get('employee_id');
  if (employee_id) {
    try {
      let { data: employees_diagram, error } = await supabase
        .from('employees_diagram')
        .select(
          `*, diagram_type(
        *)`
        ) // Filters
        .eq('employee_id', employee_id);

      const data = employees_diagram;

      if (error) {
        throw new Error(JSON.stringify(error));
      }
      return Response.json({ data });
    } catch (error) {}
  }

  try {
    let { data: employees_diagram, error } = await supabase.from('employees_diagram').select(`*,
        employee_id,
        employees (
         *
        ),
        diagram_type(
        *)
      `); // Filters

    const data = employees_diagram;

    if (error) {
      throw new Error(JSON.stringify(error));
    }

    return Response.json({ data });
  } catch (error) {}
}

export async function POST(request: NextRequest) {
  const supabase = supabaseServer();
  const bodyData = await request.json();

  try {
    // Primero verificamos si ya existe un registro para este empleado en esta fecha
    const { data: existingDiagrams, error: fetchError } = await supabase
      .from('employees_diagram')
      .select('id')
      .eq('employee_id', bodyData.employee)
      .eq('day', bodyData.day)
      .eq('month', bodyData.month)
      .eq('year', bodyData.year);

    if (fetchError) {
      console.error('Error al verificar diagrama existente:', fetchError);
      throw fetchError;
    }

    // Si ya existe un registro, lo actualizamos
    if (existingDiagrams && existingDiagrams.length > 0) {
      const { data: updatedData, error: updateError } = await supabase
        .from('employees_diagram')
        .update({
          diagram_type: bodyData.event_diagram,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDiagrams[0].id);

      if (updateError) {
        console.error('Error al actualizar diagrama existente:', updateError);
        throw updateError;
      }
      return Response.json(updatedData);
    }
    // Si no existe, insertamos uno nuevo
    else {
      const { data: newData, error: insertError } = await supabase
        .from('employees_diagram')
        .insert([
          {
            employee_id: bodyData.employee,
            diagram_type: bodyData.event_diagram,
            day: bodyData.day,
            month: bodyData.month,
            year: bodyData.year,
          },
        ])
        .select();

      if (insertError) {
        console.error('Error al insertar nuevo diagrama:', insertError);
        throw insertError;
      }
      return Response.json(newData);
    }
  } catch (error) {
    console.error('Error en POST /api/employees/diagrams:', error);
    return Response.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = supabaseServer();
  const bodyData = await request.json();
  try {
    const { data, error } = await supabase
      .from('employees_diagram')
      .update({
        employee_id: bodyData.employee,
        diagram_type: bodyData.event_diagram,
        day: bodyData.day,
        month: bodyData.month,
        year: bodyData.year,
      })
      .eq('id', bodyData.id);

    if (!error) {
      return Response.json(data);
    }
  } catch (error) {}
}
