import moment from 'moment';
import { cookies } from 'next/headers';
import type { EquipmentIndicatorResult } from '../actions/types';
import { getAllVehicleTypes, getEquipmentIndicators } from '../actions/fleet.server';
import { EquipmentOperationClient } from './EquipmentOperationClient';

export async function EquipmentOperationSection() {
  const cookiesStore = await cookies();
  const typeFilter = cookiesStore.get('type-filter')?.value;
  const typeIds = typeFilter ? typeFilter.split(',').filter(Boolean) : undefined;
  const initialFilterValues = typeIds ?? [];

  // async-parallel — only indicators + types for SSR; vehicle detail loads lazily in dialog
  const [equipmentData, vehicleTypes] = await Promise.all([getEquipmentIndicators(typeIds), getAllVehicleTypes()]);

  const date = moment().format('DD/MM/YYYY');

  // server-serialization — pre-compute with SINGLE LOOP (js-combine-iterations)
  let totalActive = 0;
  let totalInUse = 0;
  let totalNotAvailable = 0;

  for (const item of equipmentData) {
    totalActive += item.available_units;
    totalInUse += item.used_units;
    totalNotAvailable += item.not_available_units;
  }

  const totalVehicles = totalActive + totalNotAvailable;
  const totalAvailable = totalActive - totalInUse;
  const usagePercentage = totalVehicles > 0 ? Math.round((totalActive / totalVehicles) * 100) : 0;

  // Build stacked bar chart data: Disponibles / Fuera de Servicio / Trabajando
  const chartData = equipmentData
    .map((item: EquipmentIndicatorResult) => {
      const name = item.type_name;
      const shortName = name.length > 20 ? name.substring(0, 20) + '...' : name;
      return {
        name,
        shortName,
        disponibles: Math.max(0, item.available_units - item.used_units),
        fueraDeServicio: item.not_available_units,
        trabajando: item.used_units,
      };
    })
    .slice(0, 8);

  return (
    <EquipmentOperationClient
      date={date}
      chartData={chartData}
      totalActive={totalActive}
      totalInUse={totalInUse}
      totalAvailable={totalAvailable}
      usagePercentage={usagePercentage}
      typeIds={typeIds}
      vehicleTypes={vehicleTypes.map((t) => ({ label: t.name ?? '', value: t.id }))}
      initialFilterValues={initialFilterValues}
    />
  );
}
