/**
 * Fuerza `company_id` en un `where` de Prisma.
 *
 * Con Prisma (conexión directa) el RLS de Supabase NO aplica: este helper es la
 * única defensa contra fugas entre empresas en listados, conteos y facets.
 * Pisa cualquier `company_id` que traiga el `where` de entrada.
 */
export function withCompany<T extends object>(where: T | undefined, companyId: string): T & { company_id: string } {
  return { ...(where ?? ({} as T)), company_id: companyId };
}
