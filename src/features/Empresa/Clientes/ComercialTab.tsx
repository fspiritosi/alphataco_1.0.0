import ViewcomponentInternal from '@/components/ViewComponentInternal';
import CustomerTabWrapper from './components/CustomerTabWrapper';
import ServiceComponentWrapper from './components/Services/ServiceComponentWrapper';
import DataCustomersWrapper from './components/data-customer/DataCustomersWrapper';
import CustomerEquipmentTabWrapper from './components/equipos/CustomerEquipmentTabWrapper';
import SectorTabsWrapper from './components/sector_clientes/SectorTabsWrapper';

function ComercialTab({
  tabValue,
  subtab,
  localStorageName,
}: {
  localStorageName: string;
  subtab?: string;
  tabValue: string;
}) {
  const viewData = {
    defaultValue: subtab || 'customers',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'customers',
        name: 'Clientes',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Clientes',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <div>
              <DataCustomersWrapper />
            </div>
          ),
        },
      },
      {
        value: 'areas',
        name: 'Areas',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Areas',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <CustomerTabWrapper />,
        },
      },
      {
        value: 'equipment',
        name: 'Equipos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Equipos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <CustomerEquipmentTabWrapper />,
        },
      },
      {
        value: 'sector',
        name: 'Sectores',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Sectores',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <SectorTabsWrapper />,
        },
      },
      // {
      //   value: 'contacts',
      //   name: 'Contactos',
      //   restricted: [''],
      //   tab: tabValue,
      //   content: {
      //     title: 'Contactos',
      //     //description: 'Información de la empresa',
      //     buttonActioRestricted: [''],
      //     buttonAction: (
      //       <Link
      //         href={'/dashboard/company/contact/action?action=new'}
      //         className={buttonVariants({ variant: 'gh_orange', size: 'sm', className: 'font-semibold' })}
      //       >
      //         Registrar Contacto
      //       </Link>
      //     ),
      //     component: <Contacts />,
      //   },
      // },
      {
        value: 'service',
        name: 'Contratos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Contratos',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: [''],
          component: <ServiceComponentWrapper />,
        },
      },
    ],
  };

  return (
    <div className="px-0">
      <ViewcomponentInternal viewData={viewData} />
    </div>
  );
}

export default ComercialTab;
