import ViewcomponentInternal from '@/components/ViewComponentInternal';
import EquipmentBrandsWrapper from './components/EquipmentBrandsWrapper';
import EquipmentSubTypesWrapper from './components/EquipmentSubTypesWrapper';
import EquipmentTypesWrapper from './components/EquipmentTypesWrapper';
import EquipmentsModelWrapper from './components/EquipmentsModelWrapper';
function EquipmentsTabs({ tabValue }: { tabValue: string }) {
  const viewData = {
    defaultValue: 'tipos',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'tipos',
        name: 'Tipos de Unidad',
        restricted: [''],
        content: {
          title: 'Tipos de Unidad',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentTypesWrapper />,
        },
      },
      {
        value: 'marcas',
        name: 'Marcas',
        restricted: [''],
        content: {
          title: 'Marcas',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentBrandsWrapper />,
        },
      },
      {
        value: 'modelos',
        name: 'Modelos',
        restricted: [''],
        content: {
          title: 'Modelos',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentsModelWrapper />,
        },
      },
      {
        value: 'subtipos',
        name: 'Subtipos',
        restricted: [''],
        content: {
          title: 'Subtipos',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentSubTypesWrapper />,
        },
      },
    ],
  };

  return <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />;
}

export default EquipmentsTabs;
