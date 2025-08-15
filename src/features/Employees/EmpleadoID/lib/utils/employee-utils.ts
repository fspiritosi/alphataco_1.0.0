import { fetchEmployeeById } from '../actions/employee-actions';

export function formatEmployeeData(employee: Awaited<ReturnType<typeof fetchEmployeeById>>) {
  if (!employee) return null;

  return {
    full_name: `${employee.lastname?.charAt(0).toUpperCase()}${employee.lastname?.slice(1)} ${employee.firstname?.charAt(0).toUpperCase()}${employee.firstname?.slice(1)}`,
    id: employee.id,
    email: employee.email,
    cuil: employee.cuil,
    document_number: employee.document_number,
    hierarchical_position: employee.hierarchy?.name,
    company_position: employee.company_position?.id || employee.company_position,
    company_position_name: employee.company_position?.name,
    normal_hours: employee.normal_hours,
    type_of_contract: employee.type_of_contract,
    allocated_to: employee.allocated_to,
    picture: employee.picture,
    nationality: employee.nationality,
    lastname: `${employee.lastname?.charAt(0)?.toUpperCase()}${employee.lastname?.slice(1)}`,
    firstname: `${employee.firstname?.charAt(0)?.toUpperCase()}${employee.firstname?.slice(1)}`,
    document_type: employee.document_type,
    birthplace: employee.birthplace?.name?.trim(),
    gender: employee.gender,
    marital_status: employee.marital_status,
    level_of_education: employee.level_of_education,
    street: employee.street,
    street_number: employee.street_number,
    province: employee.province?.name?.trim(),
    country: employee.country?.name?.trim(),
    postal_code: employee.postal_code,
    phone: employee.phone,
    file: employee.file,
    date_of_admission: employee.date_of_admission,
    born_date: employee.born_date,
    affiliate_status: employee.affiliate_status,
    city: employee.city?.name?.trim(),
    workflow_diagram: employee.work_diagram?.name,
    contractor_employee: employee.contractor_employee?.map(({ customers }) => customers?.id),
    is_active: employee.is_active,
    reason_for_termination: employee.reason_for_termination,
    termination_date: employee.termination_date,
    status: employee.status,
    documents_employees: employee.documents_employees,
    guild_id: employee.guild?.id || employee.guild_id,
    covenants_id: employee.covenant?.id || employee.covenants_id,
    category_id: employee.category?.id || employee.category_id,
    guild: employee.guild?.name || employee.guild_id,
    covenants: employee.covenant?.name || employee.covenants_id,
    category: employee.category?.name || employee.category_id,
    cost_center_id: employee.cost_center_id,
    empleado_aptitudes:
      employee.empleado_aptitudes?.map((apt: any) => ({
        aptitud_id: apt.aptitud_id,
        aptitudes_tecnicas: apt.aptitudes_tecnicas,
      })) || [],
  };
}

export function getEmployeeStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completo':
      return 'bg-green-100 text-green-800';
    case 'incompleto':
      return 'bg-yellow-100 text-yellow-800';
    case 'pendiente':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getDocumentStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'activo':
      return 'bg-green-100 text-green-800';
    case 'expired':
    case 'vencido':
      return 'bg-red-100 text-red-800';
    case 'pending':
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
