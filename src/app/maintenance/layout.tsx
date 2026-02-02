import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { MaintenanceLayoutProvider } from './maintenance-layout-provider';

export default async function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employeeFromCookie = cookiesStore.get('empleado_id')?.value;
  const employeeFromMetadata =
    ((user?.app_metadata as any)?.employee_id as string | undefined) ??
    ((user?.user_metadata as any)?.employee_id as string | undefined);
  const employeeId = employeeFromCookie ?? employeeFromMetadata;

  // Obtener datos del empleado si existe
  let employeeData: { firstname: string; lastname: string; cuil: string } | null = null;

  if (employeeId) {
    // Buscar el empleado directamente (la tabla employees tiene company_id)
    const { data: empData } = await supabase
      .from('employees')
      .select('id, firstname, lastname, cuil')
      .eq('id', employeeId)
      .single();

    if (empData) {
      employeeData = {
        firstname: empData.firstname || '',
        lastname: empData.lastname || '',
        cuil: empData.cuil || '',
      };
    }
  }

  const employeeFullName = employeeData ? `${employeeData.firstname} ${employeeData.lastname}`.trim() : null;
  const employeeCuil = employeeData?.cuil || null;

  return (
    <MaintenanceLayoutProvider employeeName={employeeFullName} employeeCuil={employeeCuil}>
      {children}
    </MaintenanceLayoutProvider>
  );
}
