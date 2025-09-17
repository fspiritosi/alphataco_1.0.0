import { cookies } from 'next/headers';
import TablaPermanentDocumentServer from './components/TablaPermanentDocumentServer';
import { fetchInitialPermanentDocuments } from './lib/actions/actions';

async function PermanentDocuments() {
  const cookiesStore = cookies();
  const savedVisibilityPermanent = cookiesStore.get(`permanent-documents-employees`)?.value;
  const savedFiltersPermanent = cookiesStore.get(`permanent-documents-employees-filters`)?.value;

  const initialData = await fetchInitialPermanentDocuments({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    filters: [],
  });

  console.log(initialData);

  return (
    <div>
      <TablaPermanentDocumentServer
        initialData={initialData}
        savedVisibility={savedVisibilityPermanent ? JSON.parse(savedVisibilityPermanent) : {}}
        savedFilters={savedFiltersPermanent ? JSON.parse(savedFiltersPermanent) : []}
      />
    </div>
  );
}

export default PermanentDocuments;
