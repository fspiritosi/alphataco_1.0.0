import { defineSection, tab } from '../define.ts';

export const dashboardSection = defineSection({
  key: 'dashboard',
  title: 'Dashboard',
  description: 'Indicadores del día, vencimientos y estadísticas.',
  icon: 'dashboard',
  guides: [
    {
      slug: 'dashboard-principal',
      access: [tab('dashboard', 'principal')],
      covers: [],
      screens: [{ path: '/dashboard' }, { path: '/dashboard', tab: 'principal' }],
      related: ['partes-diarios', 'diagramas', 'dashboard-vencimientos', 'diagramas-afectaciones-y-desvios'],
    },
    {
      slug: 'dashboard-vencimientos',
      access: [tab('dashboard', 'documentacion')],
      covers: [tab('dashboard', 'empleados'), tab('dashboard', 'vehiculos')],
      screens: [
        { path: '/dashboard', tab: 'documentacion' },
        { path: '/dashboard', tab: 'documentacion', subtab: 'empleados' },
        { path: '/dashboard', tab: 'documentacion', subtab: 'vehiculos' },
      ],
      related: ['documentos-alertas-y-estado', 'documentos-de-empleados', 'documentos-de-equipos', 'detalle-de-documento'],
    },
    {
      slug: 'dashboard-estadisticas',
      access: [tab('dashboard', 'estadisticas')],
      covers: [
        tab('dashboard', 'operaciones'),
        tab('dashboard', 'rrhh'),
        tab('dashboard', 'mantenimiento'),
        tab('dashboard', 'desvios'),
      ],
      screens: [
        { path: '/dashboard', tab: 'estadisticas' },
        { path: '/dashboard', tab: 'estadisticas', subtab: 'operaciones' },
        { path: '/dashboard', tab: 'estadisticas', subtab: 'rrhh' },
        { path: '/dashboard', tab: 'estadisticas', subtab: 'mantenimiento' },
        { path: '/dashboard', tab: 'estadisticas', subtab: 'desvios' },
      ],
      related: ['kpis', 'partes-diarios', 'diagramas', 'diagramas-afectaciones-y-desvios'],
    },
  ],
});
