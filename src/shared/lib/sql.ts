import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { z } from 'zod';

/**
 * Llamadas a funciones SQL de `public` (reemplazo de `supabase.rpc(...)`).
 *
 * - Los argumentos SIEMPRE se bindean (`$1..$n` via `Prisma.sql` + `Prisma.join`); el único
 *   fragmento que se interpola es el nombre de la función, validado con `FUNCTION_NAME_RE`.
 * - `jsonb`: pasar `{ json: valor }` → se serializa con `JSON.stringify` y se castea `::jsonb`
 *   (`{ json: null }` produce `NULL::jsonb`). `uuid`: `{ uuid: '...' }` → `::uuid`. Los casts
 *   evitan que Postgres no pueda resolver el tipo de un parámetro cuando la función tiene
 *   sobrecargas o defaults.
 * - `bigint` de Postgres (`count(*)`, `RETURNS TABLE(... bigint)`) llega como `bigint` de JS:
 *   el schema Zod lo convierte (`z.coerce.number()` si entra en Number, o `z.bigint()`).
 * - Funciones que devuelven `void` NO van por acá (`$queryRaw` no puede deserializar `void`):
 *   usar `client.$executeRaw` directamente.
 */
export type SqlArg = string | number | boolean | null | Date | { json: unknown } | { uuid: string };

/** Mínimo que necesitan los helpers: sirve `prisma`, un `Prisma.TransactionClient` o un doble de test. */
export type SqlClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

const FUNCTION_NAME_RE = /^[a-z_][a-z0-9_]*$/;

function assertFunctionName(name: string): void {
  if (!FUNCTION_NAME_RE.test(name)) {
    throw new Error('Nombre de función SQL inválido');
  }
}

function toSqlValue(arg: SqlArg): Prisma.Sql {
  if (arg !== null && typeof arg === 'object' && !(arg instanceof Date)) {
    if ('json' in arg) {
      const serialized = arg.json === null ? null : JSON.stringify(arg.json);
      return Prisma.sql`${serialized}::jsonb`;
    }
    if ('uuid' in arg) {
      return Prisma.sql`${arg.uuid}::uuid`;
    }
  }
  return Prisma.sql`${arg}`;
}

function buildArgList(args: readonly SqlArg[]): Prisma.Sql {
  // `Prisma.join([])` lanza con array vacío.
  if (args.length === 0) return Prisma.sql`()`;
  return Prisma.sql`(${Prisma.join(args.map(toSqlValue), ', ')})`;
}

/**
 * `SELECT * FROM public.<name>($1, ...)` — para funciones que devuelven `TABLE` / `SETOF`.
 * El resultado (array de filas) se valida con `schema` y se devuelve tipado.
 */
export async function callFunction<T extends z.ZodTypeAny>(
  name: string,
  args: readonly SqlArg[],
  schema: T,
  client: SqlClient = prisma
): Promise<z.infer<T>> {
  assertFunctionName(name);
  const query = Prisma.sql`SELECT * FROM public.${Prisma.raw(name)}${buildArgList(args)}`;
  const rows = await client.$queryRaw(query);
  return schema.parse(rows);
}

/**
 * `SELECT public.<name>($1, ...) AS value` — para funciones que devuelven un escalar
 * (`boolean`, `int`, `text`, `json`). Devuelve `value` de la única fila, validado con `schema`.
 */
export async function callScalar<T extends z.ZodTypeAny>(
  name: string,
  args: readonly SqlArg[],
  schema: T,
  client: SqlClient = prisma
): Promise<z.infer<T>> {
  assertFunctionName(name);
  const query = Prisma.sql`SELECT public.${Prisma.raw(name)}${buildArgList(args)} AS value`;
  const rows = await client.$queryRaw<Array<{ value: unknown }>>(query);
  return schema.parse(rows[0]?.value);
}
