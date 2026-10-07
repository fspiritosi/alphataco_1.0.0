import { defineSection, tab } from '../define.ts';

export const ayudaSection = defineSection({
  key: 'ayuda',
  title: 'Ayuda',
  description: 'Soporte: reportar problemas y seguir tus tickets.',
  icon: 'help',
  guides: [
    {
      slug: 'soporte-tickets',
      access: [tab('ayuda', 'tickets')],
      screens: [{ path: '/dashboard/help' }, { path: '/dashboard/help', tab: 'tickets' }],
      related: ['preguntas-frecuentes', 'empresa-usuarios-y-permisos', 'como-usar-el-manual'],
    },
  ],
});
