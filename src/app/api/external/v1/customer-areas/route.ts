import { createExternalListHandler } from '@/features/ExternalApi/lib/handler';
import { fetchExternalCustomerAreas, toPublicCustomerArea } from '@/features/ExternalApi/resources/commercial';

/**
 * Nomina de areas de cliente para sistemas externos (ticket 671).
 *
 * No lleva configuracion de cache: con `cacheComponents` activado los route
 * handlers ya son dinamicos por defecto, y declarar `dynamic` es un error de
 * compilacion.
 */
export const GET = createExternalListHandler({
  endpoint: 'customer-areas',
  fetchList: fetchExternalCustomerAreas,
  toPublic: toPublicCustomerArea,
});
