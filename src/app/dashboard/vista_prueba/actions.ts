import { supabaseBrowser } from '@/lib/supabase/browser';

export type FilterType = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

export async function fetchDataForTableView(options: { pageIndex: number; pageSize: number; filters: FilterType[] }) {
  const supabase = supabaseBrowser();
  const { pageIndex, pageSize, filters } = options;

  let query = supabase.from('employees').select('*', { count: 'exact' });

  filters.forEach((filter) => {
    switch (filter.operator) {
      case 'contains':
        query = query.ilike(filter.field, `%${filter.value}%`);
        break;
      case 'equals':
        query = query.eq(filter.field, filter.value);
        break;
      case 'startsWith':
        query = query.ilike(filter.field, `${filter.value}%`);
        break;
      case 'endsWith':
        query = query.ilike(filter.field, `%${filter.value}`);
        break;
      case 'before':
        query = query.lt(filter.field, filter.value);
        break;
      case 'after':
        query = query.gt(filter.field, filter.value);
        break;
      case 'greaterThan':
        query = query.gt(filter.field, filter.value);
        break;
      case 'lessThan':
        query = query.lt(filter.field, filter.value);
        break;
    }
  });

  const { data, error, count } = await query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

  if (error) {
    console.error('Error fetching data:', error);
    return { count: 0, data: [] };
  }

  return { data: data, count: count ?? 0 };
}
