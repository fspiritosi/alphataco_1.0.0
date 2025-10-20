import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { supabaseServer } from '@/lib/supabase/server';
import { TypeOfRepair } from '@/types/types';
import { cookies } from 'next/headers';
import InfoComponent from '../InfoComponent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import RepairNewEntry from './RepairEntry';
import RepairNewEntryMultiple from './RepairEntryMultiple';
import { fetchAllTypesOfRepairs } from './actions/actions';
import { fetchMaintenanceGroupsAction } from './actions/maintenanceGroupActions';

async function RepairEntryWrapper({ equipment_id }: { equipment_id?: string }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const coockiesStore = cookies();

  // Fetch data
  const types_of_repairs = await fetchAllTypesOfRepairs();
  const equipments = await fetchAllEquipmentBasicData();
  const { groups: maintenanceGroups } = await fetchMaintenanceGroupsAction();
  const vehiclesFormatted = equipment_id ? equipments?.filter((e) => e.id === equipment_id) || [] : equipments || [];

  // Get saved preferences
  const savedVisibility2 = coockiesStore.get('repair-entry-table')?.value;
  const savedVisibilityFilters2 = coockiesStore.get('repair-entry-table-filters')?.value;

  const message =
    'El kilometraje de las unidades seleccionadas no se podran modificar durante la carga multiple, si desea cargar el kilometraje de las unidades seleccionadas, por favor haga la carga individual de cada una de ellas.';

  return (
    <Tabs defaultValue="carga_simple" className="">
      <TabsList>
        <TabsTrigger value="carga_simple">Carga individual</TabsTrigger>
        <TabsTrigger value="carga_multiple">Carga multiple</TabsTrigger>
      </TabsList>
      <TabsContent value="carga_simple">
        {' '}
        <RepairNewEntry
          user_id={user?.id}
          equipment={vehiclesFormatted}
          tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
          maintenance_groups={maintenanceGroups || []}
          default_equipment_id={equipment_id}
          savedVisibility={savedVisibility2 ? JSON.parse(savedVisibility2) : []}
          savedFilters={savedVisibilityFilters2 ? JSON.parse(savedVisibilityFilters2) : []}
        />
      </TabsContent>
      <TabsContent value="carga_multiple">
        {' '}
        <InfoComponent size="lg" message={message} />
        <RepairNewEntryMultiple
          user_id={user?.id}
          equipment={vehiclesFormatted}
          tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
          default_equipment_id={equipment_id}
          savedFilters={savedVisibilityFilters2 ? JSON.parse(savedVisibilityFilters2) : []}
          savedVisibility={savedVisibility2 ? JSON.parse(savedVisibility2) : []}
        />
      </TabsContent>
    </Tabs>
  );
}

export default RepairEntryWrapper;
