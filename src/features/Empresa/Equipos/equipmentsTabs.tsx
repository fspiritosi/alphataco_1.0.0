import ViewcomponentInternal from '@/components/ViewComponentInternal';
import EquipmentBrandsWrapper from './brand/EquipmentBrandsWrapper';
import EquipmentsModelWrapper from './model/EquipmentsModelWrapper';
import EquipmentSubTypesWrapper from './sub_types/EquipmentSubTypesWrapper';
import TitularesWrapper from './titulares/TitularesWrapper';
import EquipmentTypesWrapper from './types/EquipmentTypesWrapper';
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
      {
        value: 'titulares',
        name: 'Titulares',
        restricted: [''],
        content: {
          title: 'Titulares',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <TitularesWrapper />,
        },
      },
    ],
  };

  return <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />;
}

export default EquipmentsTabs;
