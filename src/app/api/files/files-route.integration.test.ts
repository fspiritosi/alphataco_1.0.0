import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Integración real de la ruta `/api/files/...` contra el Postgres y el MinIO del compose.
 * Corre sólo con `DATABASE_URL` y `S3_ENDPOINT` definidos:
 *
 *   docker compose --env-file .env.docker up -d postgres minio minio-init
 *   set -a; source .env.docker; set +a
 *   DATABASE_URL=postgresql://alphataco:$POSTGRES_PASSWORD@127.0.0.1:$POSTGRES_PORT/alphataco \
 *   S3_ENDPOINT=http://127.0.0.1:$MINIO_PORT \
 *   npx vitest run src/app/api/files/files-route.integration.test.ts
 *
 * Lo único que se sustituye es la sesión (sigue siendo Supabase Auth hasta P4): el resto
 * —resolver de dueño, predicado de empresa contra la base y lectura del objeto en MinIO—
 * corre de verdad. Es la única forma de probar el camino que SÍ sirve el archivo: los
 * tests unitarios no distinguen una ruta que valida de una que niega todo.
 */
const RUN = Boolean(process.env.DATABASE_URL && process.env.S3_ENDPOINT);

const sessionUserId = { current: null as string | null };
vi.mock('@/shared/lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/session')>()),
  getSessionUserId: async () => sessionUserId.current,
  getSessionCompanyClaim: async () => null,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const CREDENTIAL_ID = '99999999-9999-4999-8999-999999999991';
const PROFILE_ID = '99999999-9999-4999-8999-999999999992';
const OTHER_COMPANY = '99999999-9999-4999-8999-999999999993';
const KEY_SUFFIX = 'logo/__integration__.png';

let companyId = '';

/**
 * Cada llamada recarga la ruta: `canUseAsActiveCompany` está memoizado con React `cache()`,
 * que fuera de un request no tiene scope por request y arrastraría el resultado anterior.
 */
async function request(bucket: string, key: string) {
  vi.resetModules();
  const { GET } = await import('./[bucket]/[...path]/route');
  return GET(new Request(`http://localhost/api/files/${bucket}/${key}`), {
    params: Promise.resolve({ bucket, path: key.split('/') }),
  });
}

describe.skipIf(!RUN)('GET /api/files/[bucket]/[...path] (integración)', () => {
  beforeAll(async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { storageUpload } = await import('@/shared/lib/storage');

    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!company) throw new Error('La base del compose no tiene ninguna empresa: correr `npm run db:seed`');
    companyId = company.id;

    await prisma.profile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, credential_id: CREDENTIAL_ID, email: '__integration__@test.local' },
      update: {},
    });
    await prisma.share_company_users.deleteMany({ where: { profile_id: PROFILE_ID } });
    await prisma.share_company_users.create({
      data: { profile_id: PROFILE_ID, company_id: companyId, is_active: true },
    });

    const file = new File([new TextEncoder().encode('bytes del logo')], 'logo.png', { type: 'image/png' });
    await storageUpload('logo', `${companyId}/${KEY_SUFFIX}`, file, { upsert: true });
    await storageUpload('logo', `${OTHER_COMPANY}/${KEY_SUFFIX}`, file, { upsert: true });
  });

  afterAll(async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    const { storageRemove } = await import('@/shared/lib/storage');
    await storageRemove('logo', [`${companyId}/${KEY_SUFFIX}`, `${OTHER_COMPANY}/${KEY_SUFFIX}`]);
    await prisma.share_company_users.deleteMany({ where: { profile_id: PROFILE_ID } });
    await prisma.profile.deleteMany({ where: { id: PROFILE_ID } });
  });

  it('sirve el archivo de la empresa del usuario', async () => {
    sessionUserId.current = CREDENTIAL_ID;
    const response = await request('logo', `${companyId}/${KEY_SUFFIX}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('bytes del logo');
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toContain('private');
  });

  it('404 para el archivo de OTRA empresa, aunque exista en MinIO', async () => {
    sessionUserId.current = CREDENTIAL_ID;
    const response = await request('logo', `${OTHER_COMPANY}/${KEY_SUFFIX}`);
    expect(response.status).toBe(404);
  });

  it('404 sin sesión', async () => {
    sessionUserId.current = null;
    const response = await request('logo', `${companyId}/${KEY_SUFFIX}`);
    expect(response.status).toBe(404);
  });

  it('404 si la membresía está dada de baja', async () => {
    const { prisma } = await import('@/shared/lib/prisma');
    await prisma.share_company_users.updateMany({ where: { profile_id: PROFILE_ID }, data: { is_active: false } });
    sessionUserId.current = CREDENTIAL_ID;
    const response = await request('logo', `${companyId}/${KEY_SUFFIX}`);
    expect(response.status).toBe(404);
    await prisma.share_company_users.updateMany({ where: { profile_id: PROFILE_ID }, data: { is_active: true } });
  });
});
