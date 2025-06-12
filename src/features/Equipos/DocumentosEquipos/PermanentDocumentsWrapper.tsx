import { fetchPermanentDocumentsEquipment } from '@/app/server/GET/actions';
import { formatVehiculesDocuments } from '@/lib/utils';
import { cookies } from 'next/headers';
import PermanentDocumentsEquipment from './PermanentDocuments';

async function PermanentDocumentsEquipmentWrapper() {
  const permanentDocuments = (await fetchPermanentDocumentsEquipment()).map(formatVehiculesDocuments);
  const cookiesStore = cookies();
  const savedVisibilityPermanent = cookiesStore.get('permanent-documents-vehicles')?.value;
  const savedFiltersPermanent = cookiesStore.get('permanent-documents-vehicles-filters')?.value;

  return (
    <PermanentDocumentsEquipment
      permanentDocuments={permanentDocuments}
      savedVisibility={savedVisibilityPermanent ? JSON.parse(savedVisibilityPermanent) : undefined}
      savedFilter={savedFiltersPermanent ? JSON.parse(savedFiltersPermanent) : []}
    />
  );
}

export default PermanentDocumentsEquipmentWrapper;
