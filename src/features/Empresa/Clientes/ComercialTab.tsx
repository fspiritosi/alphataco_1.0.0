// import ViewcomponentInternal from '@/components/ViewComponentInternal';
// import CustomerEquipmentTabWrapper from '../../Comercial/Comerce/components/CustomerEquipmentTabWrapper';
// import CustomerTabWrapper from '../../Comercial/Comerce/components/CustomerTabWrapper';
// import DataCustomersWrapper from '../../Comercial/Comerce/components/DataCustomersWrapper';
// import DayliReportWraper from '../../Comercial/Comerce/components/DayliReportWraper';
// import MensureUnitsWrapper from '../../Comercial/Comerce/components/MensureUnitsWrapper';
// import SectorTabsWrapper from '../../Comercial/Comerce/components/SectorTabsWrapper';
// import ServiceComponentWrapper from '../../Comercial/Comerce/components/ServiceComponentWrapper';

// function ComercialTab({
//   tabValue,
//   subtab,
//   localStorageName,
// }: {
//   localStorageName: string;
//   subtab?: string;
//   tabValue: string;
// }) {
//   const viewData = {
//     defaultValue: subtab || 'customers',
//     path: '/dashboard/company/actualCompany',
//     tabsValues: [
//       {
//         value: 'customers',
//         name: 'Clientes',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Clientes',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: '',
//           component: (
//             <div>
//               <DataCustomersWrapper />
//             </div>
//           ),
//         },
//       },
//       {
//         value: 'areas',
//         name: 'Areas',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Areas',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: '',
//           component: <CustomerTabWrapper />,
//         },
//       },
//       {
//         value: 'equipment',
//         name: 'Equipos',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Equipos',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: '',
//           component: <CustomerEquipmentTabWrapper />,
//         },
//       },
//       {
//         value: 'sector',
//         name: 'Sectores',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Sectores',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: '',
//           component: <SectorTabsWrapper />,
//         },
//       },
//       // {
//       //   value: 'contacts',
//       //   name: 'Contactos',
//       //   restricted: [''],
//       //   tab: tabValue,
//       //   content: {
//       //     title: 'Contactos',
//       //     //description: 'Información de la empresa',
//       //     buttonActioRestricted: [''],
//       //     buttonAction: (
//       //       <Link
//       //         href={'/dashboard/company/contact/action?action=new'}
//       //         className={buttonVariants({ variant: 'gh_orange', size: 'sm', className: 'font-semibold' })}
//       //       >
//       //         Registrar Contacto
//       //       </Link>
//       //     ),
//       //     component: <Contacts />,
//       //   },
//       // },
//       {
//         value: 'service',
//         name: 'Contratos',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Contratos',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: [''],
//           component: <ServiceComponentWrapper />,
//         },
//       },
//       {
//         value: 'mensure_units',
//         name: 'Unidades de Medida',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Unidades de Medida',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: [''],
//           component: <MensureUnitsWrapper />,
//         },
//       },
//       {
//         value: 'daily_reports',
//         name: 'Partes Diarios',
//         restricted: [''],
//         tab: tabValue,
//         content: {
//           title: 'Partes Diarios',
//           //description: 'Información de la empresa',
//           buttonActioRestricted: [''],
//           buttonAction: [''],
//           component: <DayliReportWraper />,
//         },
//       },
//     ],
//   };

//   return (
//     <div className="px-0">
//       <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />
//     </div>
//   );
// }

// export default ComercialTab;
