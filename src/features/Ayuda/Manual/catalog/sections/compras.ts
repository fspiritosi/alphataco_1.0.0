import { defineSection, tab } from '../define.ts';

/**
 * Módulo Compras (`/dashboard/purchases`). Cada sección del menú es un `?tab=`; las pantallas de
 * detalle y de alta (solicitud, proveedor) tienen el id en la URL y se declaran con el comodín
 * `/*` para que el botón "?" abra la guía de la sección desde la que se llega.
 */
export const comprasSection = defineSection({
  key: 'compras',
  title: 'Compras',
  description: 'Proveedores y solicitudes de compra con su aprobación.',
  icon: 'purchases',
  guides: [
    {
      slug: 'compras',
      // Guía de entrada al módulo: la ve quien tenga Ver en cualquiera de sus secciones.
      access: [tab('compras', 'solicitudes'), tab('compras', 'proveedores'), tab('compras', 'config-compras')],
      screens: [{ path: '/dashboard/purchases' }],
      related: ['solicitudes-de-compra', 'proveedores', 'configuracion-de-compras', 'pedidos-de-materiales'],
    },
    {
      slug: 'solicitudes-de-compra',
      access: [tab('compras', 'solicitudes')],
      screens: [
        { path: '/dashboard/purchases', tab: 'solicitudes' },
        { path: '/dashboard/purchases/requests/*' },
      ],
      related: ['compras', 'proveedores', 'pedidos-de-materiales', 'materiales'],
    },
    {
      slug: 'proveedores',
      access: [tab('compras', 'proveedores')],
      screens: [
        { path: '/dashboard/purchases', tab: 'proveedores' },
        { path: '/dashboard/purchases/suppliers/*' },
      ],
      related: ['compras', 'configuracion-de-compras', 'solicitudes-de-compra'],
    },
    {
      slug: 'configuracion-de-compras',
      access: [tab('compras', 'config-compras')],
      screens: [{ path: '/dashboard/purchases', tab: 'config-compras' }],
      related: ['proveedores', 'compras'],
    },
  ],
});
