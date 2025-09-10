import { AbsenteeismTrendChart } from './components/AbsenteeismTrendChart';
import { DepartmentAbsenceCharts } from './components/DepartmentAbsenceCharts';
import { DepartmentSummaryTable } from './components/DepartmentSummaryTable';
import { DetailedAbsenceTable } from './components/DetailedAbsenceTable';
import { HeadcountTrendChart } from './components/HeadcountTrendChart';
import { SummaryCards } from './components/SummaryCards';
import { EmployeeAbsenceTable } from './components/employee-absence-table';
import EmployeeDistributionCharts from './components/employee-distribution-charts';

const summaryData = {
  dotacionAnterior: 433,
  altas: 11,
  bajas: 0,
  dotacionActual: 444,
  totalAusentes: 8,
  porcentajeAusentismo: 1.8,
};

const trendData = [
  { date: '1/8/2025', percentage: 2.76 },
  { date: '4/8/2025', percentage: 1.84 },
  { date: '7/8/2025', percentage: 2.76 },
  { date: '10/8/2025', percentage: 2.07 },
  { date: '13/8/2025', percentage: 2.77 },
  { date: '16/8/2025', percentage: 3.7 },
  { date: '19/8/2025', percentage: 2.54 },
  { date: '22/8/2025', percentage: 1.8 },
  { date: '25/8/2025', percentage: 2.3 },
  { date: '28/8/2025', percentage: 1.8 },
];

const departmentData = [
  { sector: 'ADMINISTRACION', dotacion: 45, ausentes: 1, porcentaje: 2.22 },
  { sector: 'LOGISTICA', dotacion: 256, ausentes: 4, porcentaje: 1.56 },
  { sector: 'MANTENIMIENTO', dotacion: 43, ausentes: 0, porcentaje: 0.0 },
  { sector: 'SERV ESPECIALES', dotacion: 88, ausentes: 2, porcentaje: 2.27 },
  { sector: 'ANCLAS', dotacion: 12, ausentes: 1, porcentaje: 8.33 },
];

const departmentAbsenceReasons = [
  {
    department: 'ADMINISTRACIÓN',
    data: [{ name: 'ENFERMEDAD', value: 100, color: '#f97316' }],
  },
  {
    department: 'SERVICIOS ESPECIALES',
    data: [
      { name: 'ENFERMEDAD', value: 50, color: '#f97316' },
      { name: 'LICENCIA ESPECIAL', value: 50, color: '#eab308' },
    ],
  },
  {
    department: 'LOGÍSTICA',
    data: [
      { name: 'ENFERMEDAD', value: 75, color: '#f97316' },
      { name: 'ACCIDENTE', value: 25, color: '#eab308' },
    ],
  },
  {
    department: 'MANTENIMIENTO',
    data: [
      { name: 'ENFERMEDAD', value: 40, color: '#22c55e' },
      { name: 'ACCIDENTE', value: 60, color: '#3b82f6' },
    ],
  },
];

const dailyAbsenceData = [
  {
    fecha: '1/8/2025',
    dotacion: 428,
    altas: 6,
    bajas: 0,
    vacaciones: 0,
    totalDotacion: 434,
    totalAusentes: 12,
    porcentajeAusentismo: 2.76,
  },
  {
    fecha: '2/8/2025',
    dotacion: 434,
    altas: 0,
    bajas: 0,
    vacaciones: 0,
    totalDotacion: 434,
    totalAusentes: 11,
    porcentajeAusentismo: 2.53,
  },
  {
    fecha: '3/8/2025',
    dotacion: 434,
    altas: 0,
    bajas: 0,
    vacaciones: 0,
    totalDotacion: 434,
    totalAusentes: 8,
    porcentajeAusentismo: 1.84,
  },
  {
    fecha: '4/8/2025',
    dotacion: 434,
    altas: 1,
    bajas: 0,
    vacaciones: 0,
    totalDotacion: 435,
    totalAusentes: 10,
    porcentajeAusentismo: 2.3,
  },
  {
    fecha: '5/8/2025',
    dotacion: 435,
    altas: 0,
    bajas: 0,
    vacaciones: 0,
    totalDotacion: 435,
    totalAusentes: 10,
    porcentajeAusentismo: 2.3,
  },
];

const employeeAbsenceData = [
  {
    legajo: 367,
    nombre: 'FRANCO FEDERICO NICOLAS',
    tarea: 'ATG',
    linea: 'SERV ESPECIALES',
    turno: 'DIAGRAMA',
    motivo: 'LICENCIA ESPECIAL',
    desde: '24/5/2025',
    hasta: '20/8/2025',
    observaciones: 'Reserva de puesto',
    diasCaidos: 89,
  },
  {
    legajo: 507,
    nombre: 'VALLEJOS PEDRO OSVALDO',
    tarea: 'ATG',
    linea: 'LOGISTICA',
    turno: 'DIAGRAMA',
    motivo: 'ACCIDENTE',
    desde: '26/2/2025',
    hasta: '2/9/2025',
    observaciones: 'Cirugia hombro izquierdo',
    diasCaidos: 189,
  },
  {
    legajo: 544,
    nombre: 'GARAT CRISTIAN ARIEL',
    tarea: 'ATG',
    linea: 'SERV ESPECIALES',
    turno: 'DIAGRAMA',
    motivo: 'ENFERMEDAD',
    desde: '26/5/2025',
    hasta: '21/8/2025',
    observaciones: 'Osteomelitis 1er dedo miembro inferior izquierdo',
    diasCaidos: 88,
  },
  {
    legajo: 570,
    nombre: 'TUA RAUL',
    tarea: 'Chofer C Peligrosas',
    linea: 'LOGISTICA',
    turno: 'DIAGRAMA',
    motivo: 'ENFERMEDAD',
    desde: '8/7/2025',
    hasta: '17/9/2025',
    observaciones: 'Tendinitis codo izquierdo',
    diasCaidos: 72,
  },
  {
    legajo: 193,
    nombre: 'MUÑOZ CRISTIAN',
    tarea: 'OPERADOR',
    linea: 'ANCLAS',
    turno: 'DIAGRAMA',
    motivo: 'ENFERMEDAD',
    desde: '6/8/2025',
    hasta: '21/8/2025',
    observaciones: 'Dedo en resorte. Debe ir al medico hoy',
    diasCaidos: 16,
  },
];

export function AbsenteeismDashboard() {
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <SummaryCards />

      {/* Charts Section */}
      <div className="flex flex-wrap gap-8">
        <div className="w-full lg:w-[calc(50%-1rem)] space-y-8">
          <AbsenteeismTrendChart />
          <DepartmentSummaryTable />
          <EmployeeDistributionCharts />
        </div>
        <div className="w-full lg:w-[calc(50%-1rem)] space-y-8">
          <DepartmentAbsenceCharts />
          <DetailedAbsenceTable />
          <HeadcountTrendChart />
        </div>
      </div>

      {/* Employee Details */}
      <EmployeeAbsenceTable />
    </div>
  );
}
