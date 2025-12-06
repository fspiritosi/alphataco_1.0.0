import { fetchAllDocumentTypes } from '@/app/server/GET/actions';
import { cookies } from 'next/headers';

import TypesDocumentAction from './TypesDocumentAction';
import TypesDocumentsView from './TypesDocumentsView';
export const actionComponent = (optionChildrenProp: string) => {
  return <TypesDocumentAction optionChildrenProp={optionChildrenProp} />;
};
async function TypesDocumentsViewWrapper({
  optionChildrenProp = 'all',
  equipos = false,
  empresa = false,
  personas = false,
  hideTabs = false,
}: {
  optionChildrenProp?: string;
  equipos?: boolean;
  empresa?: boolean;
  personas?: boolean;
  hideTabs?: boolean;
}) {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`document_type_employees`)?.value;
  const savedFilters = cookiesStore.get(`document_type_employees-filters`)?.value;

  const document_types = await fetchAllDocumentTypes();

  return (
    <TypesDocumentsView
      optionChildrenProp={optionChildrenProp}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : undefined}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      equipos={equipos}
      empresa={empresa}
      personas={personas || (equipos || empresa ? false : true)}
      document_types={document_types}
      actionComponent={null}
      hideTabs={hideTabs}
    />
  );
}

export default TypesDocumentsViewWrapper;
