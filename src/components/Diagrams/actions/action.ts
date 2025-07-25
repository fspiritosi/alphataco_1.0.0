// 'use server';
// import { supabaseServer } from '@/lib/supabase/server';
// import { cookies } from 'next/headers';

// export interface DiagramReportFilters {
//   employee_ids?: string[];
//   start_date?: string;
//   end_date?: string;
//   novelty_types?: string[];
//   search_text?: string;
// }

// export const fetchDiagramReports = async (filters: DiagramReportFilters = {}) => {
//   const cookiesStore = cookies();
//   const supabase = supabaseServer();
//   const company_id = cookiesStore.get('actualComp')?.value;

//   if (!company_id) return [];

//   let query = supabase
//     .from('employees_diagram')
//     .select(`
//       id,
//       day,
//       month,
//       year,
//       employee_id!inner(
//         id,
//         cuil,
//         firstname,
//         lastname
//       ),
//       diagram_type!inner(
//         id,
//         name,
//         color,
//         short_description
//       )
//     `)
//     .eq('employee_id.company_id', company_id)
//     .order('year', { ascending: false })
//     .order('month', { ascending: false })
//     .order('day', { ascending: false });

//   // Aplicar filtros
//   if (filters.employee_ids && filters.employee_ids.length > 0) {
//     query = query.in('employee_id', filters.employee_ids);
//   }

//   if (filters.start_date) {
//     const startDate = new Date(filters.start_date);
//     const startYear = startDate.getFullYear();
//     const startMonth = startDate.getMonth() + 1;
//     const startDay = startDate.getDate();

//     query = query.or(`year.gt.${startYear},and(year.eq.${startYear},month.gt.${startMonth}),and(year.eq.${startYear},month.eq.${startMonth},day.gte.${startDay})`);
//   }

//   if (filters.end_date) {
//     const endDate = new Date(filters.end_date);
//     const endYear = endDate.getFullYear();
//     const endMonth = endDate.getMonth() + 1;
//     const endDay = endDate.getDate();

//     query = query.or(`year.lt.${endYear},and(year.eq.${endYear},month.lt.${endMonth}),and(year.eq.${endYear},month.eq.${endMonth},day.lte.${endDay})`);
//   }

//   if (filters.novelty_types && filters.novelty_types.length > 0) {
//     query = query.in('diagram_type', filters.novelty_types);
//   }

//   const { data, error } = await query;

//   if (error) {
//     console.error('Error fetching diagram reports:', error);
//     return [];
//   }

//   // Transformar los datos
//   const transformedData = (data || []).map((item: any) => ({
//     id: item.id,
//     employee_cuil: item.employee_id.cuil,
//     employee_name: `${item.employee_id.firstname} ${item.employee_id.lastname}`,
//     date: `${item.day.toString().padStart(2, '0')}/${item.month.toString().padStart(2, '0')}/${item.year}`,
//     novelty_name: item.diagram_type?.name || 'N/A',
//     novelty_color: item.diagram_type?.color || '#000000',
//     novelty_short_description: item.diagram_type?.short_description || 'N/A',
//     is_active: true, // employees_diagram no tiene is_active, asumimos true
//     day: item.day,
//     month: item.month,
//     year: item.year,
//     diagram_type: item.diagram_type?.name || 'N/A',
//   }));

//   // Aplicar filtro de búsqueda de texto
//   if (filters.search_text) {
//     const searchLower = filters.search_text.toLowerCase();
//     return transformedData.filter(item =>
//       item.employee_name.toLowerCase().includes(searchLower) ||
//       item.employee_cuil.includes(searchLower) ||
//       item.novelty_name.toLowerCase().includes(searchLower) ||
//       item.novelty_short_description.toLowerCase().includes(searchLower)
//     );
//   }

//   return transformedData;
// };

// export const fetchEmployeesForReports = async () => {
//   const cookiesStore = cookies();
//   const supabase = supabaseServer();
//   const company_id = cookiesStore.get('actualComp')?.value;

//   if (!company_id) return [];

//   const { data, error } = await supabase
//     .from('employees')
//     .select('id, cuil, firstname, lastname')
//     .eq('company_id', company_id)
//     .eq('is_active', true)
//     .order('firstname');

//   if (error) {
//     console.error('Error fetching employees:', error);
//     return [];
//   }

//   return data || [];
// };

// export const fetchNoveltyTypesForReports = async () => {
//   const cookiesStore = cookies();
//   const supabase = supabaseServer();
//   const company_id = cookiesStore.get('actualComp')?.value;

//   if (!company_id) return [];

//   const { data, error } = await supabase
//     .from('diagram_type')
//     .select('id, name, color, short_description')
//     .eq('company_id', company_id)
//     .order('name');

//   if (error) {
//     console.error('Error fetching novelty types:', error);
//     return [];
//   }

//   return data || [];
// };
