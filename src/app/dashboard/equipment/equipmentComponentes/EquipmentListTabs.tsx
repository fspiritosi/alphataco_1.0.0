import ViewcomponentInternal, { ViewDataObj } from '@/components/ViewComponentInternal';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import EquipmentTableWrapper from './EquipmentTableWrapper';

export default function EquipmentListTabs({
  inactives,
  actives,
  tabValue,
  subtab,
}: {
  inactives?: boolean;
  actives?: boolean;
  tabValue: string;
  subtab: string | undefined;
}) {
  const viewData: ViewDataObj = {
    defaultValue: subtab || 'all',
    path: '/dashboard/equipment',
    tabsValues: [
      {
        value: 'all',
        name: 'Todos los equipos',
        restricted: [''],
        tab: tabValue,

        content: {
          buttonAction: (
            <div className="flex flex-wrap">
              <Link
                href="/dashboard/equipment/action?action=new"
                className={[' py-2 rounded', buttonVariants({ variant: 'default' })].join(' ')}
              >
                Agregar nuevo equipo
              </Link>
            </div>
          ),
          title: 'Todos los equipos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          component: <EquipmentTableWrapper filterType="all" />,
        },
      },
      {
        value: 'vehicles',
        name: 'Solo vehículos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Solo vehículos',
          buttonAction: (
            <div className="flex flex-wrap">
              <Link
                href="/dashboard/equipment/action?action=new"
                className={[' py-2 rounded', buttonVariants({ variant: 'default' })].join(' ')}
              >
                Agregar nuevo equipo
              </Link>
            </div>
          ),
          buttonActioRestricted: [''],
          component: <EquipmentTableWrapper filterType="vehicles" />,
        },
      },
      {
        value: 'others',
        name: 'Otros',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Otros',
          buttonAction: (
            <div className="flex flex-wrap">
              <Link
                href="/dashboard/equipment/action?action=new"
                className={[' py-2 rounded', buttonVariants({ variant: 'default' })].join(' ')}
              >
                Agregar nuevo equipo
              </Link>
            </div>
          ),
          buttonActioRestricted: [''],
          component: <EquipmentTableWrapper filterType="others" />,
        },
      },
    ],
  };

  return (
    <div className=" max-w-full">
      <ViewcomponentInternal viewData={viewData} />
      {/* <Tabs defaultValue="all">
        <CardContent className="pl-0 pb-0">
          <TabsList>
            <TabsTrigger value="all">Todos los equipos</TabsTrigger>
            <TabsTrigger value="vehicles">Solo vehículos</TabsTrigger>
            <TabsTrigger value="others">Otros</TabsTrigger>
          </TabsList>
        </CardContent>
        <TabsContent value="all">
          <EquipmentTable role={role} columns={EquipmentColums || []} data={equipments || []} />
        </TabsContent>
        <TabsContent value="vehicles">
          <EquipmentTable role={role} columns={EquipmentColums || []} data={onlyVehicles || []} />
        </TabsContent>
        <TabsContent value="others">
          <EquipmentTable role={role} columns={EquipmentColums || []} data={onlyNoVehicles || []} />
        </TabsContent>
      </Tabs> */}
    </div>
  );
}
