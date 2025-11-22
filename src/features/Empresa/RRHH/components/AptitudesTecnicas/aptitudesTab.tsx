import { getAptitudesData } from '../../actions/rrhh/aptitudesTecnicas';
import { AptitudesClient } from './aptitudesClient';

export default async function AptitudesTab() {
  const { aptitudes, positions } = await getAptitudesData();

  return (
    // <div className="space-y-6">
    <AptitudesClient initialAptitudes={aptitudes} initialPositions={positions} />
    // </div>
  );
}
