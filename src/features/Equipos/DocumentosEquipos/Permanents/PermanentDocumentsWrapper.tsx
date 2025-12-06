import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import PermanentEquipmentDocumentsTableServer from './components/PermanentEquipmentDocumentsTableServer';
import { fetchPermanentEquipmentDocumentsData } from './components/lib/actions/actions';

async function PermanentEquipmentDocumentsWrapper() {
  const cookiesStore = await cookies();

  // 🔑 IMPORTANTE: Gestión de cookies para persistencia
  const savedVisibilityPermanent = cookiesStore.get('permanent-documents-equipment')?.value;
  const savedFiltersPermanent = cookiesStore.get('permanent-documents-equipment-filters')?.value;

  // 🔑 IMPORTANTE: Carga de datos iniciales
  const initialData = await fetchPermanentEquipmentDocumentsData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <Card className="p-6">
      <PermanentEquipmentDocumentsTableServer
        initialData={initialData}
        savedVisibility={savedVisibilityPermanent ? JSON.parse(savedVisibilityPermanent) : undefined}
        savedFilters={savedFiltersPermanent ? JSON.parse(savedFiltersPermanent) : []}
      />
    </Card>
  );
}

export default PermanentEquipmentDocumentsWrapper;
