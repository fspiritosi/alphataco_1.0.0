import { createExternalListHandler } from '@/features/ExternalApi/lib/handler';
import { fetchExternalOtherEquipment, toPublicOtherEquipment } from '@/features/ExternalApi/resources/other-equipment';

/**
 * Nomina de equipamiento para sistemas externos (ticket 671).
 *
 * No lleva configuracion de cache: con `cacheComponents` activado los route
 * handlers ya son dinamicos por defecto, y declarar `dynamic` es un error de
 * compilacion.
 */
export const GET = createExternalListHandler({
  endpoint: 'other-equipment',
  fetchList: fetchExternalOtherEquipment,
  toPublic: toPublicOtherEquipment,
});
