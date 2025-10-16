import ViewcomponentInternal, { ViewDataObj } from '../ViewComponentInternal';
import MaintenanceGroupsWrapper from './MaintenanceGroupsWrapper';
import RepairEntryWrapper from './RepairEntryWrapper';
import RepairSolicitudesWrapper from './RepairSolicitudesWrapper';
import RepairTypeFormWrapper from './RepairTypeFormWrapper';

function RepairTypes({
  type_of_repair_new_entry,
  created_solicitudes,
  type_of_repair,
  defaultValue,
  mechanic,
  equipment_id,
  subtab,
  tabValue,
  path,
  hiddenTabs,
}: {
  type_of_repair_new_entry?: boolean;
  type_of_repair_new_entry2?: boolean;
  type_of_repair_new_entry3?: boolean;
  created_solicitudes?: boolean;
  type_of_repair?: boolean;
  defaultValue?: string;
  mechanic?: boolean;
  equipment_id?: string;
  subtab?: string;
  tabValue: string;
  path?: string;
  hiddenTabs?: string[];
}) {
  const viewData: ViewDataObj = {
    defaultValue: subtab || 'created_solicitudes',
    path: path || '/dashboard/equipment',
    tabsValues: [
      {
        value: 'created_solicitudes',
        name: mechanic ? 'Solicitudes activas' : 'Solicitudes de mantenimiento',
        restricted: [''],
        tab: tabValue,
        content: {
          title: mechanic ? 'Solicitudes activas' : 'Solicitudes de mantenimiento',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          component: <RepairSolicitudesWrapper mechanic={mechanic} equipment_id={equipment_id} />,
        },
      },
      {
        value: 'type_of_repair',
        name: 'Tipos de reparaciones creados',
        restricted: [''],
        tab: tabValue,
        content: {
          buttonActioRestricted: [''],
          title: 'Tipos de reparaciones creados',
          //description: 'Información de la empresa',
          component: <RepairTypeFormWrapper />,
        },
      },
      {
        value: 'type_of_repair_new_entry',
        name: 'Solicitud de mantenimiento',
        restricted: [''],
        tab: tabValue,
        content: {
          buttonActioRestricted: [''],
          title: 'Solicitud de mantenimiento',
          //description: 'Información de la empresa',
          component: <RepairEntryWrapper equipment_id={equipment_id} />,
        },
      },
      {
        value: 'maintenance_groups',
        name: 'Grupos de mantenimiento',
        restricted: [''],
        tab: tabValue,
        content: {
          buttonActioRestricted: [''],
          title: 'Grupos de mantenimiento',
          //description: 'Información de la empresa',
          component: <MaintenanceGroupsWrapper />,
        },
      },
    ].filter((tab) => !hiddenTabs?.includes(tab.value)),
  };

  return <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />;
}

export default RepairTypes;
