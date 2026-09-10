import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Contrato comun de la API externa: parametros de consulta, formato de la
 * respuesta y formato de los errores. Todos los endpoints lo comparten para
 * que el sistema externo integre una sola vez y no una por recurso.
 */

/** Tope duro: sin esto, `pageSize` se vuelve una forma de esquivar la paginacion */
export const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export const externalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** Por defecto solo registros activos; en true devuelve tambien las bajas */
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Filtran por fecha de alta. Ojo: NO detectan ediciones posteriores */
  createdSince: z.string().date().optional(),
  createdUntil: z.string().date().optional(),
});

export type ExternalListQuery = z.infer<typeof externalListQuerySchema>;

export type ExternalListResult<T> = {
  data: T[];
  total: number;
};

/** Respuesta exitosa con su bloque de paginacion */
export function listResponse<T>(items: T[], total: number, query: ExternalListQuery) {
  return NextResponse.json(
    {
      data: items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    },
    { status: 200 }
  );
}

/** Error con cuerpo uniforme, para que el tercero maneje un solo formato */
export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Rango de fechas de alta, listo para el `where` de Prisma */
export function buildCreatedAtFilter(query: ExternalListQuery) {
  if (!query.createdSince && !query.createdUntil) return undefined;

  return {
    ...(query.createdSince ? { gte: new Date(`${query.createdSince}T00:00:00.000Z`) } : {}),
    ...(query.createdUntil ? { lte: new Date(`${query.createdUntil}T23:59:59.999Z`) } : {}),
  };
}
