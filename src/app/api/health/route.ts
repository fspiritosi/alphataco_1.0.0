import { NextResponse, connection } from 'next/server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('api/health');

/**
 * Commit con el que se construyó esta imagen. Lo inyecta el build de Docker (`ARG GIT_SHA`).
 *
 * Sirve para que el deploy sepa si ya está respondiendo el contenedor nuevo: el contenedor
 * viejo también responde "ok", así que sin el commit el chequeo de readiness daría verde antes
 * de que la versión nueva llegue a existir.
 */
const GIT_SHA = process.env.GIT_SHA || null;

/**
 * Health check del contenedor y del deploy (docs/deploy/runbook.md). Es la única API route que
 * no es un endpoint de negocio: la consumen el HEALTHCHECK del Dockerfile y el workflow de
 * deploy, que no pueden llamar Server Actions. No requiere sesión: el proxy de auth sólo cubre
 * /dashboard/*.
 */
export async function GET() {
  // Con cacheComponents, un GET que no lee el request se prerenderiza en el build. Esto lo
  // fuerza a responder en cada request (y a no tocar la base durante `next build`).
  await connection();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', sha: GIT_SHA }, { status: 200 });
  } catch (error) {
    logger.error('Health check sin conexión a la base de datos', { data: { error } });
    return NextResponse.json({ status: 'db_unavailable', sha: GIT_SHA }, { status: 503 });
  }
}
