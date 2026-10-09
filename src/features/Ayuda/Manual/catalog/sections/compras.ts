import { defineSection, tab } from '../define.ts';

/**
 * Módulo Compras (`/dashboard/purchases`). Cada sección del menú es un `?tab=`; las pantallas de
 * detalle y de alta (solicitud, cotización, orden de compra, proveedor) tienen el id en la URL y se declaran con el comodín
 * `/*` para que el botón "?" abra la guía de la sección desde la que se llega.
 */
export const comprasSection = defineSection({
  key: 'compras',
  title: 'Compras',
  description: 'Proveedores, solicitudes de compra, pedidos de cotización y órdenes de compra.',
  icon: 'purchases',
  guides: [
    {
      slug: 'compras',
      // Guía de entrada al módulo: la ve quien tenga Ver en cualquiera de sus secciones.
      access: [
        tab('compras', 'solicitudes'),
        tab('compras', 'cotizaciones'),
        tab('compras', 'ordenes'),
        tab('compras', 'proveedores'),
        tab('compras', 'config-compras'),
      ],
      screens: [{ path: '/dashboard/purchases' }],
      related: [
        'solicitudes-de-compra',
        'pedidos-de-cotizacion',
        'ordenes-de-compra',
        'proveedores',
        'configuracion-de-compras',
        'pedidos-de-materiales',
      ],
    },
    {
      slug: 'solicitudes-de-compra',
      access: [tab('compras', 'solicitudes')],
      screens: [
        { path: '/dashboard/purchases', tab: 'solicitudes' },
        { path: '/dashboard/purchases/requests/*' },
      ],
      related: ['compras', 'pedidos-de-cotizacion', 'ordenes-de-compra', 'proveedores', 'pedidos-de-materiales', 'materiales'],
    },
    {
      slug: 'pedidos-de-cotizacion',
      access: [tab('compras', 'cotizaciones')],
      screens: [
        { path: '/dashboard/purchases', tab: 'cotizaciones' },
        { path: '/dashboard/purchases/quotes/*' },
      ],
      related: ['solicitudes-de-compra', 'ordenes-de-compra', 'proveedores', 'compras'],
    },
    {
      slug: 'ordenes-de-compra',
      access: [tab('compras', 'ordenes')],
      screens: [
        { path: '/dashboard/purchases', tab: 'ordenes' },
        { path: '/dashboard/purchases/orders/*' },
      ],
      related: ['solicitudes-de-compra', 'pedidos-de-cotizacion', 'proveedores', 'compras'],
    },
    {
      slug: 'proveedores',
      access: [tab('compras', 'proveedores')],
      screens: [
        { path: '/dashboard/purchases', tab: 'proveedores' },
        { path: '/dashboard/purchases/suppliers/*' },
      ],
      related: ['compras', 'configuracion-de-compras', 'solicitudes-de-compra', 'ordenes-de-compra'],
    },
    {
      slug: 'configuracion-de-compras',
      access: [tab('compras', 'config-compras')],
      screens: [{ path: '/dashboard/purchases', tab: 'config-compras' }],
      related: ['proveedores', 'compras'],
    },
  ],
});
