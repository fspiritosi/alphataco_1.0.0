import { createExternalListHandler } from '@/features/ExternalApi/lib/handler';
import { fetchExternalVehicles, toPublicVehicle } from '@/features/ExternalApi/resources/vehicles';

/**
 * Nomina de vehiculos para sistemas externos (ticket 671).
 *
 * No lleva configuracion de cache: con `cacheComponents` activado los route
 * handlers ya son dinamicos por defecto, y declarar `dynamic` es un error de
 * compilacion.
 */

export const GET = createExternalListHandler({
  endpoint: 'vehicles',
  fetchList: fetchExternalVehicles,
  toPublic: toPublicVehicle,
});
