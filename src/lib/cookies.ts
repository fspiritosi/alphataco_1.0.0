export type FilterValue = string | string[] | { from?: Date | null; to?: Date | null } | undefined;

export type TableFilterState = {
  // Filtros de columnas (para filtros facetados y búsquedas)
  columnFilters: Array<{
    id: string;
    value: FilterValue;
    type?: 'faceted' | 'search' | 'date-range';
    title?: string; // Título del filtro (opcional, para mejor legibilidad)
  }>;

  // Ordenamiento
  sorting: Array<{ id: string; desc: boolean }>;

  // Paginación
  pagination: {
    pageIndex: number;
    pageSize: number;
  };

  // Visibilidad de columnas
  columnVisibility: Record<string, boolean>;
};

export function getTableFilters(tableId: string): TableFilterState | null {
  if (typeof window === 'undefined') return null;

  const cookieValue = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`table-filters-${tableId}=`))
    ?.split('=')[1];

  if (!cookieValue) return null;

  try {
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch (e) {
    console.error('Error parsing filters from cookies', e);
    return null;
  }
}

export function setTableFilters(tableId: string, filters: TableFilterState) {
  if (typeof window === 'undefined') return;

  const cookieValue = encodeURIComponent(JSON.stringify(filters));
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 1 semana de duración

  document.cookie = `table-filters-${tableId}=${cookieValue}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

export function clearTableFilters(tableId: string) {
  if (typeof window === 'undefined') return;

  document.cookie = `table-filters-${tableId}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
