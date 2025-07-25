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
          component: (
            // <Suspense fallback={<div>Cargando tabla de empleados...</div>}>
            <EmployeeTable />
            // </Suspense>
          ),
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
          component: (
            // <Suspense fallback={<div>Cargando tabla de empleados...</div>}>
            <EmpleadosInactivosTable />
            // </Suspense>
          ),
        },
      },
    ],
  };

  return <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />;
}

export default EmployeeListTabs;
