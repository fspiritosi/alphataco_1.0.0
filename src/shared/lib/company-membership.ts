export type CompanyAccessInput = {
  profileId: string;
  company: { owner_id: string | null } | null;
  membership: { is_active: boolean } | null;
};

/**
 * Regla pura de pertenencia a una empresa: el profile puede operar sobre la
 * empresa si es su owner (`company.owner_id`) o si tiene una fila activa en
 * `share_company_users`. Cualquier otro caso (empresa inexistente, sin
 * membership o membership inactiva) se rechaza.
 */
export function canAccessCompany({ profileId, company, membership }: CompanyAccessInput): boolean {
  if (company?.owner_id === profileId) return true;
  return membership?.is_active === true;
}

export type CompanyTenantInput = CompanyAccessInput & {
  /** `true` si el empleado vinculado al profile pertenece a esa empresa. */
  hasEmployeeInCompany: boolean;
};

/**
 * Regla pura de "empresa activa": ¿este profile tiene un vinculo legitimo con la empresa?
 *
 * Es mas amplia que `canAccessCompany()` a proposito. El sistema tiene dos clases de
 * usuario y solo una es miembro del dashboard:
 *
 * - El usuario del dashboard: owner de la empresa o miembro activo de `share_company_users`.
 * - El operario (panel de ropa, QR de mantenimiento): NO es miembro, su vinculo con la
 *   empresa es el empleado al que esta atado su profile (`profile.employee_id`).
 *
 * Exigir pertenencia al dashboard dejaria sin empresa activa a los paneles de operario;
 * aceptar cualquier uuid es lo que hacia el sistema antes. Esta es la linea del medio: el
 * perimetro de cada feature sigue siendo el suyo (`assertCompanyAccess()` para las
 * acciones del dashboard, `requireClothingOperator()` para el panel de ropa), esto solo
 * decide si un `companyId` puede ser la empresa activa del request.
 *
 * Las dos ramas son independientes, y eso importa: un miembro DADO DE BAJA
 * (`share_company_users.is_active = false`) igual pasa si ademas es empleado de la empresa
 * — la rama de empleado no mira la membership. Es deliberado: el operario nunca fue miembro,
 * asi que darlo de baja del dashboard no deberia dejarlo sin su panel. La ventana real es
 * chica porque dar de baja a un usuario tambien banea su credencial en Auth: solo sobrevive
 * una sesion ya abierta.
 *
 * Decision explicita sobre `employees.is_active`: la rama de empleado NO lo mira. Quien
 * escribe la cookie en esos flujos (`clothingLogin`, el login del QR) tampoco lo exige, y
 * `getClothingOperator()` resuelve el operario sin filtrar por activo: chequearlo aca dejaria
 * a `getActiveCompanyId()` mas estricto que el login que puso el valor, con el panel roto y
 * el login exitoso. Si alguna vez se decide cerrarle la puerta al empleado dado de baja, el
 * cambio va en los tres lugares a la vez, no solo aca.
 */
export function canUseCompanyAsTenant(input: CompanyTenantInput): boolean {
  if (canAccessCompany(input)) return true;
  return input.hasEmployeeInCompany;
}
