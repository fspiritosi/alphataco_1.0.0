import { defineSection, tab } from '../define.ts';

export const documentacionSection = defineSection({
  key: 'documentacion',
  title: 'Documentación',
  description: 'Documentos de empleados, equipos y empresa: carga, vencimientos y aprobación.',
  icon: 'documents',
  guides: [
    {
      slug: 'documentos-de-empleados',
      access: [tab('documentacion', 'documentos-de-empleados')],
      covers: [tab('documentacion', 'docs-empleados-permanentes'), tab('documentacion', 'docs-empleados-mensuales')],
      screens: [
        { path: '/dashboard/document' },
        { path: '/dashboard/document', tab: 'documentos-de-empleados' },
      ],
      related: ['documentos-alertas-y-estado', 'tipos-de-documento', 'detalle-de-documento', 'ficha-del-empleado'],
    },
    {
      slug: 'documentos-de-equipos',
      access: [tab('documentacion', 'documentos-de-equipos')],
      covers: [tab('documentacion', 'docs-equipos-permanentes'), tab('documentacion', 'docs-equipos-mensuales')],
      screens: [{ path: '/dashboard/document', tab: 'documentos-de-equipos' }],
      related: ['documentos-alertas-y-estado', 'tipos-de-documento', 'detalle-de-documento', 'ficha-del-vehiculo'],
    },
    {
      slug: 'documentos-de-empresa',
      access: [tab('documentacion', 'documentos-de-empresa')],
      covers: [tab('documentacion', 'docs-empresa-permanentes'), tab('documentacion', 'docs-empresa-mensuales')],
      screens: [{ path: '/dashboard/document', tab: 'documentos-de-empresa' }],
      related: ['detalle-de-documento', 'tipos-de-documento', 'datos-de-la-empresa', 'documentos-alertas-y-estado'],
    },
    {
      slug: 'detalle-de-documento',
      access: [tab('documentacion', 'detalle-de-documento')],
      covers: [
        tab('documentacion', 'detalle-doc-empresa'),
        tab('documentacion', 'detalle-doc-empleado'),
        tab('documentacion', 'detalle-doc-documento'),
      ],
      // El detalle vive en /dashboard/document/<id> y sus pestañas usan ?tab=. El catálogo no
      // admite segmentos dinámicos, así que se declaran las pestañas: una regla con `tab` gana
      // por prefijo sobre la raíz del módulo. Sin `tab` en la URL (primera apertura), el "?"
      // cae en la guía de la raíz.
      // El detalle vive en /dashboard/document/<id>, con o sin ?tab= (Documento, Empresa,
      // Empleado, Actualizar): cualquier página hija de Documentación es el detalle.
      screens: [{ path: '/dashboard/document/*' }],
      related: ['documentos-alertas-y-estado', 'documentos-de-empleados', 'documentos-de-equipos', 'documentos-de-empresa'],
    },
  ],
});
