'use client';

import { useEffect, useState } from 'react';
import { fetchEmployeeById } from '../actions/employee-actions';
import { formatEmployeeData } from '../utils/employee-utils';

export function useEmployeeData(employeeId: string) {
  const [employee, setEmployee] = useState<ReturnType<typeof formatEmployeeData>>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployee = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchEmployeeById(employeeId);
      if (data) {
        setEmployee(formatEmployeeData(data));
      } else {
        setError('Empleado no encontrado');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const refreshEmployee = async () => {
    await loadEmployee();
  };

  return {
    employee,
    isLoading,
    error,
    refreshEmployee,
  };
}
