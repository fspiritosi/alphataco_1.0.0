'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Employees/employeesActions');

export async function getEmployeesName() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
            id,
            firstname,
            lastname,
            file
        `
    )
    .eq('is_active', true)
    .order('lastname', { ascending: true });

  if (error) {
    logger.error('Error fetching employees', { data: { error } });
    return [];
  }

  return data;
}

export async function getEmployeeDiagramByIdandDate(
  id: string,
  fromDate: { year: number; month: number; day: number },
  toDate: { year: number; month: number; day: number }
) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees_diagram')
    .select(
      `
            id,
            day,
            month,
            year,
            employees(id, firstname, lastname),
            diagram_type(id, name)
        `
    )
    .eq('employee_id', id)
    .or(
      `and(year.eq.${fromDate.year},month.eq.${fromDate.month},day.gte.${fromDate.day}),and(year.eq.${toDate.year},month.eq.${toDate.month},day.lte.${toDate.day})`
    );
  if (error) {
    logger.error('Error fetching employee diagrams by date', { data: { error } });
    return [];
  }

  return data;
}

export type EmployeeDiagram = Awaited<ReturnType<typeof getEmployeeDiagramByIdandDate>>;
