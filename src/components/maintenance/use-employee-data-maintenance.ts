'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import cookies from 'js-cookie';
import { useEffect, useState } from 'react';

interface EmployeeData {
  employeeName: string | null;
  employeeCuil: string | null;
}

export function useEmployeeDataMaintenance() {
  const [employeeData, setEmployeeData] = useState<EmployeeData>({
    employeeName: null,
    employeeCuil: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        setIsLoading(true);
        const supabase = supabaseBrowser();

        // Obtener user de la sesión
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Obtener employee_id de cookies o metadata
        const employeeFromCookie = cookies.get('empleado_id');
        const employeeFromMetadata =
          ((user?.app_metadata as any)?.employee_id as string | undefined) ??
          ((user?.user_metadata as any)?.employee_id as string | undefined);
        const employeeId = employeeFromCookie ?? employeeFromMetadata;

        // Si no hay employee_id, intentar obtener nombre de cookies o metadata
        if (!employeeId) {
          const empleadoNameFromCookie = cookies.get('empleado_name');
          const empleadoNameFromMetadata =
            ((user?.user_metadata as any)?.fullname as string | undefined) ??
            ((user?.user_metadata as any)?.employeeName as string | undefined);
          const empleado_name = empleadoNameFromCookie ?? empleadoNameFromMetadata;

          setEmployeeData({
            employeeName: empleado_name || null,
            employeeCuil: null,
          });
          setIsLoading(false);
          return;
        }

        // Obtener datos del empleado desde la base de datos
        const { data: empData, error } = await supabase
          .from('employees')
          .select('firstname, lastname, cuil')
          .eq('id', employeeId)
          .single();

        if (error) {
          console.error('Error fetching employee data:', error);
          // Fallback a cookies/metadata
          const empleadoNameFromCookie = cookies.get('empleado_name');
          const empleadoNameFromMetadata =
            ((user?.user_metadata as any)?.fullname as string | undefined) ??
            ((user?.user_metadata as any)?.employeeName as string | undefined);
          const empleado_name = empleadoNameFromCookie ?? empleadoNameFromMetadata;

          setEmployeeData({
            employeeName: empleado_name || null,
            employeeCuil: null,
          });
        } else if (empData) {
          const fullName = `${empData.firstname || ''} ${empData.lastname || ''}`.trim();
          setEmployeeData({
            employeeName: fullName || null,
            employeeCuil: empData.cuil || null,
          });
        }
      } catch (error) {
        console.error('Error in useEmployeeDataMaintenance:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmployeeData();
  }, []);

  return { employeeData, isLoading };
}
