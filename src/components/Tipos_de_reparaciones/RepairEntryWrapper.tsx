import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { TabsManagerServer } from '@/features/TabsManager';
import { supabaseServer } from '@/lib/supabase/server';
import { TypeOfRepair } from '@/types/types';
import { FileText, Files } from 'lucide-react';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import InfoComponent from '../InfoComponent';
import { Card } from '../ui/card';
import RepairNewEntry from './RepairEntry';
import RepairNewEntryMultiple from './RepairEntryMultiple';
import { fetchAllTypesOfRepairs } from './actions/actions';
import { fetchMaintenanceGroupsAction } from './actions/maintenanceGroupActions';

async function RepairEntryWrapper({
  equipment_id,
  searchParams,
}: {
  equipment_id?: string;
  searchParams: { [key: string]: string | string[] | undefined };
}) {
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
    <TabsManagerServer
      paramName="mode"
      searchParams={searchParams}
      defaultTab="carga-individual"
      tabs={[
        {
          value: 'carga-individual',
          label: (
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Carga Individual
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'carga-individual',
          content: (
            <Suspense fallback={<div>Cargando formulario...</div>}>
              <RepairNewEntry
                user_id={user?.id}
                equipment={vehiclesFormatted}
                tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
                maintenance_groups={maintenanceGroups || []}
                default_equipment_id={equipment_id}
                savedVisibility={savedVisibility2 ? JSON.parse(savedVisibility2) : []}
                savedFilters={savedVisibilityFilters2 ? JSON.parse(savedVisibilityFilters2) : []}
              />
            </Suspense>
          ),
        },
        {
          value: 'carga-multiple',
          label: (
            <span className="flex items-center gap-2">
              <Files className="h-4 w-4" />
              Carga Múltiple
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'carga-multiple',
          content: (
            <Suspense fallback={<div>Cargando formulario...</div>}>
              <Card className="p-6">
                <InfoComponent size="lg" message={message} />
                <RepairNewEntryMultiple
                  user_id={user?.id}
                  equipment={vehiclesFormatted}
                  tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
                  default_equipment_id={equipment_id}
                  savedFilters={savedVisibilityFilters2 ? JSON.parse(savedVisibilityFilters2) : []}
                  savedVisibility={savedVisibility2 ? JSON.parse(savedVisibility2) : []}
                />
              </Card>
            </Suspense>
          ),
        },
      ]}
    />
  );
}

export default RepairEntryWrapper;
