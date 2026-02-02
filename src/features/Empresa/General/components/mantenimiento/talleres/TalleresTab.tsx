import { cookies } from 'next/headers';
import { fetchAllWorkshops } from '../../../actions/workshops.actions';
import { TalleresTabClient } from './TalleresTabClient';

async function TalleresTab() {
  const cookiesStore = await cookies();
  const workshops = fetchAllWorkshops();
  const savedVisibility = cookiesStore.get('talleres-table')?.value;
  const savedFilter = cookiesStore.get('talleres-table-filters')?.value;

  return (
    <TalleresTabClient
      workshops={workshops}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
    />
  );
}

export default TalleresTab;
