import { createExternalListHandler } from '@/features/ExternalApi/lib/handler';
import { fetchExternalEmployees, toPublicEmployee } from '@/features/ExternalApi/resources/employees';

/**
 * Nomina de empleados para sistemas externos (ticket 671).
 *
 * No lleva configuracion de cache: con `cacheComponents` activado los route
 * handlers ya son dinamicos por defecto, y declarar `dynamic` es un error de
 * compilacion.
 */

export const GET = createExternalListHandler({
  endpoint: 'employees',
  fetchList: fetchExternalEmployees,
  toPublic: toPublicEmployee,
});
