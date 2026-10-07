import { defineSection, tab } from '../define.ts';

export const seleccionSection = defineSection({
  key: 'seleccion',
  title: 'Selección',
  description: 'Candidatos, pre ingreso y alta del legajo.',
  icon: 'recruitment',
  guides: [
    {
      slug: 'candidatos',
      access: [tab('seleccion', 'candidatos')],
      covers: [],
      screens: [{ path: '/dashboard/recruitment' }, { path: '/dashboard/recruitment/detail' }],
      related: ['de-candidato-a-legajo', 'ficha-del-empleado', 'tipos-de-documento', 'altas-y-bajas'],
    },
  ],
});
