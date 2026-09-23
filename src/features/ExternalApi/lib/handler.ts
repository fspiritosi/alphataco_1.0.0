import { Logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import { logExternalApiAccess } from './access-log';
import { authenticateExternalApiRequest, extractAttemptedClientId } from './auth';
import {
  errorResponse,
  externalListQuerySchema,
  listResponse,
  type ExternalListQuery,
  type ExternalListResult,
} from './request';

const logger = new Logger('features/ExternalApi/handler');

/**
 * Fabrica de endpoints de listado de la API externa.
 *
 * Estos endpoints (`/api/external/v1/*`) son la otra excepcion legitima a la regla
 * "Server Actions, no API routes": los consume software de terceros por HTTP, no la app.
 * No tienen consumidores dentro del repo justamente por eso; borrarlos romperia
 * integraciones externas que no se ven desde el codigo.
 *
 * Los cinco recursos comparten exactamente el mismo ciclo —autenticar,
 * validar parametros, consultar, registrar el acceso— y solo se diferencian en
 * la consulta y en el mapeo del resultado. Centralizarlo evita que un endpoint
 * nuevo se olvide del registro de accesos o devuelva un error con otra forma.
 */
export function createExternalListHandler<TRow, TPublic>(options: {
  /** Nombre logico del recurso que queda en el registro de accesos */
  endpoint: string;
  fetchList: (params: { companyId: string; query: ExternalListQuery }) => Promise<ExternalListResult<TRow>>;
  /** Traduce la fila de Prisma al JSON publico: unico punto que define el contrato */
  toPublic: (row: TRow) => TPublic;
}) {
  return async function handleGet(request: NextRequest) {
    const startedAt = Date.now();
    const { endpoint } = options;

    const auth = await authenticateExternalApiRequest(request);

    if (!auth.ok) {
      await logExternalApiAccess({
        endpoint,
        statusCode: auth.status,
        request,
        attemptedClientId: auth.attemptedClientId ?? extractAttemptedClientId(request.headers.get('authorization')),
        errorMessage: auth.code,
        responseTimeMs: Date.now() - startedAt,
      });
      return errorResponse(auth.status, auth.code, auth.message);
    }

    const parsedQuery = externalListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

    if (!parsedQuery.success) {
      await logExternalApiAccess({
        endpoint,
        statusCode: 400,
        request,
        clientId: auth.client.id,
        attemptedClientId: auth.attemptedClientId,
        errorMessage: 'VALIDATION_ERROR',
        responseTimeMs: Date.now() - startedAt,
      });
      return errorResponse(400, 'VALIDATION_ERROR', 'Los parametros de la consulta no son validos.');
    }

    const query = parsedQuery.data;

    try {
      const { data, total } = await options.fetchList({ companyId: auth.client.companyId, query });

      await logExternalApiAccess({
        endpoint,
        statusCode: 200,
        request,
        clientId: auth.client.id,
        attemptedClientId: auth.attemptedClientId,
        queryParams: query,
        responseTimeMs: Date.now() - startedAt,
      });

      return listResponse(data.map(options.toPublic), total, query);
    } catch (error) {
      logger.error('Error al resolver un recurso de la API externa', { data: { error, endpoint } });

      await logExternalApiAccess({
        endpoint,
        statusCode: 500,
        request,
        clientId: auth.client.id,
        attemptedClientId: auth.attemptedClientId,
        queryParams: query,
        errorMessage: 'INTERNAL_ERROR',
        responseTimeMs: Date.now() - startedAt,
      });

      // Al tercero nunca se le devuelve el detalle del error
      return errorResponse(500, 'INTERNAL_ERROR', 'Error interno del servidor.');
    }
  };
}
