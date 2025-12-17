import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import MensureUnitsTab from '../../../Empresa/Clientes/components/meansure_units/MensureUnitsTab';
import { fetchMeasureUnits } from '../../../Empresa/Clientes/components/meansure_units/actions/actions';

async function MensureUnitsWrapper() {
  const unitMeasurements = await fetchMeasureUnits();
  const cookieStore = await cookies();
  const savedFilters = cookieStore.get('meanureUnitsTable-filters')?.value;
  const savedVisibility = cookieStore.get('meanureUnitsTable')?.value;
  return (
    <Card className="p-6">
      <MensureUnitsTab
        units={unitMeasurements}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : '{}'}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </Card>
  );
}

export default MensureUnitsWrapper;
