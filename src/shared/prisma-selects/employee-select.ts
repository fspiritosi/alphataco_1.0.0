/**
 * Campos de un empleado tal como los muestra la tabla de Empleados.
 *
 * Vive aca y no dentro de la feature porque la API externa (ticket 671) expone
 * exactamente estos mismos datos: si se agrega una columna a la tabla, el
 * tercero la recibe sin que haya que tocar dos listas.
 */
export const EMPLOYEE_SELECT = {
  id: true,
  created_at: true,
  lastname: true,
  firstname: true,
  full_name: true,
  cuil: true,
  document_type: true,
  document_number: true,
  nationality: true,
  gender: true,
  marital_status: true,
  level_of_education: true,
  born_date: true,
  picture: true,
  street: true,
  street_number: true,
  province: true,
  city: true,
  postal_code: true,
  phone: true,
  email: true,
  file: true,
  normal_hours: true,
  date_of_admission: true,
  affiliate_status: true,
  cost_type: true,
  status: true,
  is_active: true,
  reason_for_termination: true,
  termination_date: true,
  // FK relations resolved
  provinces: { select: { id: true, name: true } },
  cities: { select: { id: true, name: true } },
  countries: { select: { id: true, name: true } },
  hierarchy: { select: { id: true, name: true } },
  company_positions: { select: { id: true, name: true } },
  types_of_contract: { select: { id: true, name: true } },
  work_diagram: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  covenant: { select: { id: true, name: true } },
  guild: { select: { id: true, name: true } },
  cost_center: { select: { id: true, name: true } },
  // M:M relations
  contractor_employee: {
    select: {
      customers: { select: { id: true, name: true } },
    },
  },
  empleado_aptitudes: {
    select: {
      aptitudes_tecnicas: { select: { id: true, nombre: true } },
    },
  },
  employee_workshop_sectors: {
    select: {
      workshop_sectors: { select: { id: true, name: true } },
    },
  },
} as const;
