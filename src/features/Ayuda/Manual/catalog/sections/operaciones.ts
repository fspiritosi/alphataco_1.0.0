import { defineSection, tab } from '../define.ts';

export const operacionesSection = defineSection({
  key: 'operaciones',
  title: 'Operaciones',
  description: 'Pedidos de servicio y partes diarios.',
  icon: 'operations',
  guides: [
    {
      slug: 'gestor-de-pedidos',
      access: [tab('operaciones', 'preparte')],
      screens: [{ path: '/dashboard/operations' }, { path: '/dashboard/operations', tab: 'preparte' }],
      related: ['partes-diarios', 'detalle-del-parte', 'del-pedido-a-la-factura', 'contratos', 'clientes'],
    },
    {
      slug: 'partes-diarios',
      access: [tab('operaciones', 'dailyreportstable')],
      screens: [{ path: '/dashboard/operations', tab: 'dailyreportstable' }],
      related: ['detalle-del-parte', 'gestor-de-pedidos', 'del-pedido-a-la-factura', 'partes-diarios-comercial'],
    },
    {
      // El detalle vive en /dashboard/operations/<id>: la pantalla raíz del módulo ya lo cubre por
      // prefijo, así que esta guía no declara pantallas propias.
      slug: 'detalle-del-parte',
      access: [tab('operaciones', 'detalle-parte-diario')],
      // El detalle vive en /dashboard/operations/<id>.
      screens: [{ path: '/dashboard/operations/*' }],
      related: [
        'partes-diarios',
        'diagramas-afectaciones-y-desvios',
        'gestor-de-pedidos',
        'partes-diarios-comercial',
        'certificaciones',
        'diagramas',
      ],
    },
  ],
});
