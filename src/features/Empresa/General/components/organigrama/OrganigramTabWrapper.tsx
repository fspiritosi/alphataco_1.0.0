import { cookies } from 'next/headers';
import { fetchAllSectors } from '../../actions/actions';
import OrganigramTab from './OrganigramTab';

export default async function OrganigramTabWrapper() {
  const cookiesStore = cookies();
  const sectors = await fetchAllSectors();

  const savedVisibilityOrganigram = cookiesStore.get('organigram-table')?.value;
  const savedFilterOrganigram = cookiesStore.get('organigram-table-filters')?.value;

  return (
    <OrganigramTab
      sectors={sectors}
      savedVisibility={savedVisibilityOrganigram ? JSON.parse(savedVisibilityOrganigram) : {}}
      savedFilter={savedFilterOrganigram ? JSON.parse(savedFilterOrganigram) : []}
    />
  );
}
