import {
  fetchAllAptitudesTecnicas,
  fetchAllHierarchicalPositions,
  fetchAllPositions,
  fetchPositionAptitudes,
} from '@/features/Empresa/RRHH/actions/actions';

export async function getPositionsData() {
  const [positions, hierarchicalPositions, aptitudes] = await Promise.all([
    fetchAllPositions(),
    fetchAllHierarchicalPositions(),
    fetchAllAptitudesTecnicas(),
  ]);

  // Agregar las aptitudes a cada puesto
  const positionsWithAptitudes = await Promise.all(
    positions.map(async (position) => {
      if (!position.id) return { ...position, aptitudes: [] };
      const positionAptitudes = await fetchPositionAptitudes(position.id);
      return { ...position, aptitudes: positionAptitudes };
    })
  );

  return { positions: positionsWithAptitudes, hierarchicalPositions, aptitudes };
}
