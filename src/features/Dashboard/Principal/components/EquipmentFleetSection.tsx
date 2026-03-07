import { getEquipmentIndicators, getVehiclesOnRepair } from '../actions/actions.server';
import { EquipmentFleetClient } from './EquipmentFleetClient';

const MOTOR_UNIT_TYPES = ['chasis', 'tractor'];

export async function EquipmentFleetSection() {
  // Promise.all — async-parallel (Vercel best practice)
  // getEquipmentIndicators is wrapped with React.cache() so it deduplicates
  // with EquipmentOperationSection's call in the same render.
  const [equipmentData, vehiclesOnRepair] = await Promise.all([getEquipmentIndicators(), getVehiclesOnRepair()]);

  // Pre-compute fleet metrics with SINGLE LOOP (not 4 separate .reduce())
  let totalActive = 0;
  let totalInUse = 0;
  let totalNotAvailable = 0;

  // Motor units (Chasis & Tractor) — separate metrics
  let motorActive = 0;
  let motorInUse = 0;
  let motorNotAvailable = 0;

  for (const item of equipmentData) {
    totalActive += item.available_units;
    totalInUse += item.used_units;
    totalNotAvailable += item.not_available_units;

    if (MOTOR_UNIT_TYPES.includes(item.type_name.toLowerCase())) {
      motorActive += item.available_units;
      motorInUse += item.used_units;
      motorNotAvailable += item.not_available_units;
    }
  }

  const totalFleet = totalActive + totalNotAvailable;
  const availabilityPercent = totalFleet > 0 ? Math.round((totalActive / totalFleet) * 100) : 0;
  const usagePercent = totalActive > 0 ? Math.round((totalInUse / totalActive) * 100) : 0;

  // Motor unit metrics
  const motorFleet = motorActive + motorNotAvailable;
  const motorAvailabilityPercent = motorFleet > 0 ? Math.round((motorActive / motorFleet) * 100) : 0;
  const motorUsagePercent = motorActive > 0 ? Math.round((motorInUse / motorActive) * 100) : 0;

  return (
    <EquipmentFleetClient
      totalActive={totalActive}
      totalNotAvailable={totalNotAvailable}
      totalInUse={totalInUse}
      totalFleet={totalFleet}
      availabilityPercent={availabilityPercent}
      usagePercent={usagePercent}
      vehiclesOnRepair={vehiclesOnRepair}
      motorActive={motorActive}
      motorInUse={motorInUse}
      motorNotAvailable={motorNotAvailable}
      motorFleet={motorFleet}
      motorAvailabilityPercent={motorAvailabilityPercent}
      motorUsagePercent={motorUsagePercent}
    />
  );
}
