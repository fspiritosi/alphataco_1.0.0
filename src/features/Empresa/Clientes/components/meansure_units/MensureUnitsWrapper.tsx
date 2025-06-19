import { cookies } from 'next/headers';
import MensureUnitsTab from './MensureUnitsTab';
import { fetchMeasureUnits } from './actions/actions';

async function MensureUnitsWrapper() {
  const unitMeasurements = await fetchMeasureUnits();
  const cookieStore = cookies();
  const savedFilters = cookieStore.get('meanureUnitsTable-filters')?.value;
  const savedVisibility = cookieStore.get('meanureUnitsTable')?.value;
  return (
    <MensureUnitsTab
      units={unitMeasurements}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : '{}'}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default MensureUnitsWrapper;
