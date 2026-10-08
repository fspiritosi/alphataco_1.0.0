import { defineSection, tab } from '../define.ts';

export const formulariosSection = defineSection({
  key: 'formularios',
  title: 'Formularios',
  description: 'Formularios y checklists.',
  icon: 'forms',
  guides: [
    {
      slug: 'formularios',
      access: [tab('formularios', 'formularios')],
      screens: [{ path: '/dashboard/forms' }, { path: '/dashboard/forms', tab: 'formularios' }],
      related: ['del-checklist-al-taller', 'qr-del-equipo', 'equipos-con-desvios', 'validar-solicitudes', 'ficha-del-vehiculo'],
    },
  ],
});
