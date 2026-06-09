/**
 * Seed inicial: para cada profile, fetcha sus tickets de TaskApp y crea
 * una fila en support_ticket_views con last_seen_at = now y last_seen_status_id
 * = status actual. Evita que al estrenar la feature todos los tickets viejos
 * aparezcan como "no leídos".
 *
 * Uso (manual, one-shot): npx tsx scripts/seed-support-ticket-views.ts
 */
import { prisma } from '@/shared/lib/prisma';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { Logger } from '@/lib/logger';

const logger = new Logger('scripts/seed-support-ticket-views');

async function main() {
  const profiles = await prisma.profile.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  logger.info(`Found ${profiles.length} profiles to seed`);

  let totalInserts = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;

    try {
      const { tickets } = await taskAppClient.listTicketsByReporter(profile.email);
      if (tickets.length === 0) continue;

      const data = tickets.map((t) => ({
        user_id: profile.id,
        taskapp_ticket_id: BigInt(t.id),
        last_seen_at: new Date(),
        last_seen_status_id: BigInt(t.status_id),
      }));

      const result = await prisma.support_ticket_views.createMany({
        data,
        skipDuplicates: true,
      });

      totalInserts += result.count;
      logger.info(`Seeded ${result.count} views for ${profile.email}`);
    } catch (error) {
      logger.error(`Failed to seed views for ${profile.email}`, { data: { error } });
    }
  }

  logger.info(`Done. Total inserts: ${totalInserts}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Fatal error', { data: { error: err } });
    process.exit(1);
  });
