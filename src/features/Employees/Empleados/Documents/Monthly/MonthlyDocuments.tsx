// 🔑 CRÍTICO: Migración completa de client-side a Server Component optimizado
import { cookies } from 'next/headers';
import MonthlyDocumentsTableServer from './components/MonthlyDocumentsTableServer';
import { fetchMonthlyDocumentsData } from './lib/actions/actions';

// ✅ MIGRACIÓN CORRECTA: Server Component que mantiene la misma funcionalidad
async function MonthlyDocuments({}) {
  const cookiesStore = cookies();

  // 🔑 IMPORTANTE: Gestión de cookies para persistencia (nueva funcionalidad)
  const savedVisibilityMonthly = cookiesStore.get(`monthly-documents-employees`)?.value;
  const savedFiltersMonthly = cookiesStore.get(`monthly-documents-employees-filters`)?.value;

  // 🔑 IMPORTANTE: Carga de datos iniciales en el servidor (reemplaza client-side loading)
  const initialData = await fetchMonthlyDocumentsData({
    pageIndex: 0,
    pageSize: 10, // ✅ MEJORA: Paginación en lugar de cargar todo
    sorting: [],
    columnFilters: [],
    filters: [], // Filtros permanentes se aplican automáticamente en la función
  });

  // ✅ MANTENER: Misma estructura visual, pero ahora server-side optimizado
  return (
    <MonthlyDocumentsTableServer
      initialData={initialData}
      savedVisibility={savedVisibilityMonthly ? JSON.parse(savedVisibilityMonthly) : {}}
      savedFilters={savedFiltersMonthly ? JSON.parse(savedFiltersMonthly) : []}
    />
  );
}

export default MonthlyDocuments;
