import { fetchMonthlyDocumentsEquipment } from '@/app/server/GET/actions';
import { formatVehiculesDocuments } from '@/lib/utils';
import { cookies } from 'next/headers';
import MonthlyDocumentsEquipment from './MonthlyDocuments';

async function MonthlyDocumentsEquipmentWrapper() {
  const monthlyDocuments = (await fetchMonthlyDocumentsEquipment()).map(formatVehiculesDocuments);
  const cookiesStore = cookies();
  const savedVisibilityMonthly = cookiesStore.get('monthly-documents-vehicles')?.value;
  const savedFiltersMonthly = cookiesStore.get('monthly-documents-vehicles-filters')?.value;

  return (
    <MonthlyDocumentsEquipment
      monthlyDocuments={monthlyDocuments}
      savedVisibility={savedVisibilityMonthly ? JSON.parse(savedVisibilityMonthly) : undefined}
      savedFilter={savedFiltersMonthly ? JSON.parse(savedFiltersMonthly) : []}
    />
  );
}

export default MonthlyDocumentsEquipmentWrapper;
