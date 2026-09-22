'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('shared/covenants');

/** Sindicatos de la empresa activa con sus convenios y categorías (árbol CCT). */
export async function getGuildsWithCovenants() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.guild.findMany({
      where: withCompany({}, companyId),
      include: { covenant: { include: { category: true } } },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching guilds with covenants', { data: { error } });
    throw error;
  }
}

export type GuildWithCovenants = Awaited<ReturnType<typeof getGuildsWithCovenants>>[number];
