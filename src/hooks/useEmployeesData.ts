import { Employee } from '@/types/types';
import Cookies from 'js-cookie';
import { supabase } from '../../supabase/supabase';
import { useEdgeFunctions } from './useEdgeFunctions';

export const useEmployeesData = () => {
  const { errorTranslate } = useEdgeFunctions();
  const company_id = Cookies.get('actualComp');

  return {
    createEmployee: async (employee: Employee) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, company_id: company_id, allocated_to: employee.allocated_to ?? [] })
        .select();

      if (error) {
        const message = await errorTranslate(error.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return data;
    },
    updateEmployee: async (employee: Employee, id?: string) => {
      if (Array.isArray(employee.allocated_to)) {
        const allocated_to = employee.allocated_to?.map((item: any) => {
          return { contractor_id: item, employee_id: id };
        });

        await supabase.from('contractor_employee').delete().eq('employee_id', id);

        const { data, error } = await supabase.from('contractor_employee').insert(allocated_to).select();
      }

      const { data, error } = await supabase
        .from('employees')
        .update({
          ...employee,
          covenants_id: employee.covenants_id ? employee.covenants_id : null,
          category_id: employee.category_id ? employee.category_id : null,
          guild_id: employee.guild_id ? employee.guild_id : null,
        })
        .eq('document_number', employee.document_number)
        .select();

      if (error) {
        const message = await errorTranslate(error.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return data;
    },
  };
};
