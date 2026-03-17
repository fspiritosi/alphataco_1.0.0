'use client';
import { useLoggedUserStore } from '@/shared/store/loggedUser';
// import { supabase } from '../../supabase/supabase';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useEdgeFunctions } from '@/shared/hooks/useEdgeFunctions';
import { company } from '@/shared/types/legacy';
//import { industry } from './../types/types';

export const useCompanyData = () => {
  const { errorTranslate } = useEdgeFunctions();
  //const [industry, setIndustry] = useState<any[]>([])
  const supabase = supabaseBrowser();
  return {
    fetchAllCompany: async () => {
      let { data: company, error } = await supabase.from('company').select('*');

      if (error) {
        const message = await errorTranslate(error?.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return company;
    },

    findByOwner: async (owner: any) => {
      let { data: company, error } = await supabase.from('company').select('*').eq('owner_id', 'owner');

      if (error) {
        const message = await errorTranslate(error?.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return company;
    },
    insertCompany: async (company: company) => {
      const { data, error } = await supabase
        .from('company')
        .insert(company as any)
        .select();

      if (error) {
        const message = await errorTranslate(error?.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return data;
    },

    updateCompany: async (companyId: string, company: company) => {
      const { data, error } = await supabase
        .from('company')
        .update(company as any)
        .eq('id', companyId)
        .select();

      if (error) {
        const message = await errorTranslate(error.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return data;
    },
    LogicDeleteCompany: async (companyId: string) => {
      const { data, error } = await supabase
        .from('company')
        .update({ is_active: false }) // Establece is_Active en false para el borrado lógico
        .eq('id', companyId)
        .select();
      if (error) {
        const message = await errorTranslate(error.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
      return data;
    },

    deleteCompany: async (companyId: string) => {
      const { error } = await supabase.from('company').delete().eq('id', 'companyId');

      if (error) {
        const message = await errorTranslate(error.message);
        throw new Error(String(message).replaceAll('"', ''));
      }
    },

    fetchIndustryType: async () => {
      const { data, error } = await supabase.from('industry_type').select('*');

      if (error) {
        console.error('Error al obtener las industrias:', error);
      }

      return data;
    },

    fetchCompanies: async () => {
      // Obtener las compañías actualizadas de Supabase
      const { data, error } = await supabase.from('company').select('*, province_id(id, name), city(id, name)');
      if (error) {
        console.error('Error al obtener las compañías:', error);
      } else {
        // Actualizar el estado global con las nuevas compañías
        useLoggedUserStore.setState({ allCompanies: (data as any) || [] });
      }
    },
  };
};
