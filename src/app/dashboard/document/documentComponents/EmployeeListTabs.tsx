import ViewcomponentInternal from '@/components/ViewComponentInternal';
import { buttonVariants } from '@/components/ui/button';
import EmpleadosInactivosTable from '@/features/Employees/Empleados/EmpleadosInactivos/EmpleadosInactivosTable';
import EmployeeTable from '@/features/Employees/Empleados/components/employee_table';
import Link from 'next/link';

async function EmployeeListTabs({
  inactives,
  actives,
  tabValue,
  subtab,
}: {
  inactives?: boolean;
  actives?: boolean;
  subtab?: string;
  tabValue: string;
}) {
  const viewData = {
    defaultValue: subtab || 'Empleados activos',
    path: '/dashboard/employee',
    tabsValues: [
      {
        value: 'Empleados activos',
        name: 'Empleados activos',
        tab: tabValue,
        restricted: [''],
        content: {
          title: 'Empleados activos',
          description: 'Empleados activos',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex  flex-wrap">
              <Link
                href="/dashboard/employee/action?action=new"
                className={[' rounded', buttonVariants({ variant: 'gh_orange' })].join(' ')}
              >
                Agregar nuevo empleado
              </Link>
            </div>
          ),
          // component: <EmployeesTable role={role} columns={EmployeesListColumns} data={activeEmploees || []} />,
          component: <EmployeeTable />,
        },
      },
      {
        value: 'Empleados inactivos',
        name: 'Empleados inactivos',
        tab: tabValue,
        restricted: [''],
        content: {
          title: 'Empleados inactivos',
          description: 'Empleados inactivos',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex  flex-wrap">
              <Link
                href="/dashboard/employee/action?action=new"
                className={[' rounded', buttonVariants({ variant: 'gh_orange' })].join(' ')}
              >
                Agregar nuevo empleado
              </Link>
            </div>
          ),
          component: <EmpleadosInactivosTable />,
        },
      },
    ],
  };

  return (
    <ViewcomponentInternal viewData={viewData} />
    // <Tabs defaultValue="Empleados activos">
    //   <CardContent>
    //     <TabsList>
    //       {actives && <TabsTrigger value="Empleados activos">Empleados activos</TabsTrigger>}{' '}
    //       {inactives && role !== 'Invitado' && (
    //         <TabsTrigger value="Empleados inactivos">Empleados inactivos</TabsTrigger>
    //       )}{' '}
    //     </TabsList>
    //   </CardContent>
    //   <TabsContent value="Empleados activos">
    //     <EmployeesTable role={role} columns={EmployeesListColumns} data={activeEmploees || []} />
    //   </TabsContent>
    //   <TabsContent value="Empleados inactivos">
    //     <EmployeesTable role={role} columns={EmployeesListColumns} data={inactiveEmploees || []} />
    //   </TabsContent>
    // </Tabs>
  );
}

export default EmployeeListTabs;
