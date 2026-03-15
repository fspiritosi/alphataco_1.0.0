import { getAptitudesData } from '../../actions/rrhh/aptitudesTecnicas';
import { AptitudesClient } from './aptitudesClient';

export default async function AptitudesTab() {
  const { aptitudes, positions } = await getAptitudesData();

  return <AptitudesClient initialAptitudes={aptitudes} initialPositions={positions} />;
}
