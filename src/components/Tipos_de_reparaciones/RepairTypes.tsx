import ViewcomponentInternal, { ViewDataObj } from '../ViewComponentInternal';
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
    ],
  };

  return (
    <ViewcomponentInternal viewData={viewData} />
    // <Tabs defaultValue={defaultValue || 'created_solicitudes'}>
    //   <TabsList>
    //     {created_solicitudes && (
    //       <TabsTrigger value="created_solicitudes">
    //         {mechanic ? 'Solicitudes activas' : 'Solicitudes de mantenimiento'}
    //       </TabsTrigger>
    //     )}
    //     {type_of_repair_new_entry && (
    //       </TabsList>
    //       <TabsContent value="carga_simple">
    //         {' '}
    //         <RepairNewEntry
    //           user_id={user?.id}
    //           equipment={vehiclesFormatted}
    //           tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
    //           default_equipment_id={equipment_id}
    //         />
    //       </TabsContent>
    //       <TabsContent value="carga_multiple">
    //         {' '}
    //         <InfoComponent size='lg' message={message} />
    //         <RepairNewEntryMultiple
    //           user_id={user?.id}
    //           equipment={vehiclesFormatted}
    //           tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
    //           default_equipment_id={equipment_id}
    //         />
    //       </TabsContent>
    //     </Tabs>
    //   </TabsContent>
    //   <TabsContent value="type_of_repair_new_entry2">
    //     <RepairNewEntry
    //       tipo_de_mantenimiento={(types_of_repairs as TypeOfRepair).filter(
    //         (e) => e.type_of_maintenance === 'Preventivo'
    //       )}
    //       equipment={vehiclesFormatted}
    //       limittedEquipment
    //       user_id={user?.id}
    //     />
    //   </TabsContent>
    //   <TabsContent value="type_of_repair_new_entry3">
    //     <RepairNewEntry
    //       user_id={user?.id}
    //       tipo_de_mantenimiento={(types_of_repairs as TypeOfRepair).filter(
    //         (e) => e.type_of_maintenance === 'Correctivo'
    //       )}
    //       equipment={vehiclesFormatted}
    //     />
    //   </TabsContent>
    //   <TabsContent value="created_solicitudes">
    //     <RepairSolicitudes mechanic={mechanic} default_equipment_id={equipment_id} />
    //   </TabsContent>
    // </Tabs>
  );
}

export default RepairTypes;
