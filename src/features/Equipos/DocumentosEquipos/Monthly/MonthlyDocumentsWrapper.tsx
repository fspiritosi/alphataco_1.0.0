import { cookies } from 'next/headers';
import MonthlyEquipmentDocumentsTableServer from './components/MonthlyEquipmentDocumentsTableServer';
import { fetchMonthlyEquipmentDocumentsData } from './components/lib/actions/actions';

async function MonthlyEquipmentDocumentsWrapper() {
  const cookiesStore = cookies();

  // 🔑 IMPORTANTE: Gestión de cookies para persistencia
  const savedVisibilityMonthly = cookiesStore.get('monthly-documents-equipment')?.value;
  const savedFiltersMonthly = cookiesStore.get('monthly-documents-equipment-filters')?.value;

  // 🔑 IMPORTANTE: Carga de datos iniciales
  const initialData = await fetchMonthlyEquipmentDocumentsData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <MonthlyEquipmentDocumentsTableServer
      initialData={initialData}
      savedVisibility={savedVisibilityMonthly ? JSON.parse(savedVisibilityMonthly) : undefined}
      savedFilters={savedFiltersMonthly ? JSON.parse(savedFiltersMonthly) : []}
    />
  );
}

export default MonthlyEquipmentDocumentsWrapper;
