import { createExternalListHandler } from '@/features/ExternalApi/lib/handler';
import { fetchExternalCommercialSectors, toPublicCommercialSector } from '@/features/ExternalApi/resources/commercial';

/**
 * Nomina de sectores comerciales para sistemas externos (ticket 671).
 *
 * No lleva configuracion de cache: con `cacheComponents` activado los route
 * handlers ya son dinamicos por defecto, y declarar `dynamic` es un error de
 * compilacion.
 */
export const GET = createExternalListHandler({
  endpoint: 'commercial-sectors',
  fetchList: fetchExternalCommercialSectors,
  toPublic: toPublicCommercialSector,
});
