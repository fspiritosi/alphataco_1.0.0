'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { guildReadScope, guildWriteScope } from '../lib/cct-scope';
import type { CctMutationResult } from './types';

const logger = new Logger('features/Empresa/CCT/guilds');

const guildInputSchema = z.object({
  name: z.string().trim().min(2, 'El nombre del sindicato debe tener al menos 2 caracteres'),
});

/** Primera letra en mayúscula: el catálogo se venía cargando así desde el modal. */
function normalizeName(name: string): string {
  const trimmed = name.trim();
  return trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1);
}

/**
 * Sindicatos visibles para la empresa activa con sus convenios y categorías (árbol CCT).
 * `guild.company_id` es nullable: los sindicatos globales los ven todas las empresas.
 */
export async function getGuildsWithCovenants() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.guild.findMany({
      where: guildReadScope(companyId),
      select: {
        id: true,
        name: true,
        covenant: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener sindicatos con convenios', { data: { error } });
    throw error;
  }
}

/** Alta de sindicato para la empresa activa. Rechaza el duplicado por nombre (ticket 616). */
export async function createGuild(input: { name: string }): Promise<CctMutationResult> {
  const parsed = guildInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const companyId = await getActiveCompanyId();
    const name = normalizeName(parsed.data.name);

    const existing = await prisma.guild.findFirst({
      where: { ...guildWriteScope(companyId), name: { equals: name, mode: 'insensitive' } },
      select: { name: true },
    });
    if (existing) return { ok: false, error: `Ya existe el sindicato "${existing.name}".` };

    const created = await prisma.guild.create({
      data: { name, ...guildWriteScope(companyId) },
      select: { id: true },
    });

    revalidatePath('/dashboard/company/actualCompany');
    return { ok: true, id: created.id };
  } catch (error) {
    logger.error('Error al crear sindicato', { data: { error } });
    return { ok: false, error: 'No se pudo crear el sindicato. Intente nuevamente.' };
  }
}

export type GuildWithCovenants = Awaited<ReturnType<typeof getGuildsWithCovenants>>[number];
