import ViewcomponentInternal from '@/components/ViewComponentInternal';
import EquipmentBrandsWrapper from './components/EquipmentBrandsWrapper';
import EquipmentTypesWrapper from './components/EquipmentTypesWrapper';
import EquipmentsModelWrapper from './components/EquipmentsModelWrapper';

function EquipmentsTabs() {
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
    ],
  };

  return <ViewcomponentInternal viewData={viewData} />;
}

export default EquipmentsTabs;
