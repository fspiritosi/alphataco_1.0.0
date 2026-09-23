'use server';

import { checkPermissionServer } from '@/features/Permissions/actions/permissions.server';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { storagePublicUrl, storageUpload } from '@/shared/lib/storage';
import { assertCompanyAccess, getActiveCompanyId, NoActiveCompanyError } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { buildLogoPath, parseCompanyForm, type CompanyFormValues } from '../lib/company-form';

/**
 * Datos de la empresa (`company`): lectura de la empresa activa, alta y edición.
 *
 * Perímetro sin RLS: las lecturas usan la empresa activa de la sesión; `updateCompany` recibe el
 * `companyId` del cliente y lo valida con `assertCompanyAccess` + owner/permiso `empresa.general.update`.
 * El `owner_id` del alta y el actor de la transacción salen SIEMPRE de la sesión.
 */
const logger = new Logger('features/Empresa/General/company');

/** Bucket público con los logos de empresa (P3: storage). */
const LOGO_BUCKET = 'logo';

export type CompanyMutationResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// ─── Lecturas ────────────────────────────────────────────────────────────────

/** `{ company_name }` de la empresa activa o null si no hay empresa activa (cabeceras del dashboard). */
export async function getCompanyName() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.company.findUnique({ where: { id: companyId }, select: { company_name: true } });
  } catch (error) {
    if (!(error instanceof NoActiveCompanyError)) {
      logger.error('Error al obtener el nombre de la empresa', { data: { error } });
    }
    return null;
  }
}

/** Ficha de la empresa activa (tab Empresa → Empresa). Sólo los campos que muestra `CompanyComponent`. */
export async function getActiveCompany() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        company_name: true,
        company_cuit: true,
        address: true,
        country: true,
        industry: true,
        contact_phone: true,
        contact_email: true,
        company_logo: true,
        cities: { select: { name: true } },
        provinces: { select: { name: true } },
      },
    });
  } catch (error) {
    if (!(error instanceof NoActiveCompanyError)) {
      logger.error('Error al obtener datos de empresa', { data: { error } });
    }
    return null;
  }
}

export type CompanyData = Awaited<ReturnType<typeof getActiveCompany>>;

/** Catálogo global de industrias (selector del formulario de empresa). */
export async function getIndustryTypes() {
  const rows = await prisma.industry_type.findMany({
    where: { is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return rows.map((r) => ({ id: Number(r.id), name: r.name ?? '' }));
}

/**
 * true si el profile de sesión ya está vinculado a alguna empresa (como owner o como miembro
 * de `share_company_users`). Los formularios de alta/edición lo usan para decidir si mostrar el
 * cartel de "no tenés ninguna compañía registrada". El profile sale SIEMPRE de la sesión.
 */
export async function hasAnyCompanyMembership(): Promise<boolean> {
  try {
    const credentialId = await getSessionUserId();
    if (!credentialId) return false;
    const profile = await prisma.profile.findUnique({ where: { credential_id: credentialId }, select: { id: true } });
    if (!profile) return false;

    const [owned, shared] = await Promise.all([
      prisma.company.count({ where: { owner_id: profile.id } }),
      prisma.share_company_users.count({ where: { profile_id: profile.id } }),
    ]);
    return owned > 0 || shared > 0;
  } catch (error) {
    logger.error('Error al verificar las empresas del usuario', { data: { error } });
    return false;
  }
}

/**
 * Empresa a editar, con ciudad y provincia resueltas, o `null` si el usuario no puede editarla.
 *
 * `companyId` llega POR RUTA (`/dashboard/company/[id]`), o sea del caller: sin RLS hay que
 * validarlo acá o cualquier uuid de empresa sería legible. Se aplica el MISMO perímetro que
 * `updateCompany`: pertenencia (`assertCompanyAccess`) + owner o permiso `empresa.general.update`.
 * Así no se puede abrir un formulario de edición que después no se va a poder guardar.
 */
export async function getCompanyForEdit(companyId: string) {
  try {
    await assertCompanyAccess(companyId);
    const { profileId } = await requireSessionProfile();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        owner_id: true,
        company_name: true,
        company_cuit: true,
        website: true,
        contact_email: true,
        contact_phone: true,
        address: true,
        country: true,
        industry: true,
        description: true,
        cities: { select: { id: true, name: true } },
        provinces: { select: { id: true, name: true } },
      },
    });
    if (!company) return null;

    const isOwner = company.owner_id === profileId;
    if (!isOwner && !(await checkPermissionServer('empresa', 'general', 'update'))) {
      logger.warn('Intento de edición de empresa sin permiso', { data: { companyId } });
      return null;
    }

    const { owner_id: _ownerId, cities, provinces, ...rest } = company;
    return {
      ...rest,
      city: cities ? { id: Number(cities.id), name: cities.name } : null,
      province: provinces ? { id: Number(provinces.id), name: provinces.name } : null,
    };
  } catch (error) {
    logger.error('Error al obtener la empresa a editar', { data: { error, companyId } });
    return null;
  }
}

export type CompanyForEdit = NonNullable<Awaited<ReturnType<typeof getCompanyForEdit>>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireSessionProfile(): Promise<{ credentialId: string; profileId: string }> {
  const credentialId = await getSessionUserId();
  if (!credentialId) throw new Error('Sesión requerida');
  const profile = await prisma.profile.findUnique({ where: { credential_id: credentialId }, select: { id: true } });
  if (!profile) throw new Error('El usuario de sesión no tiene perfil');
  return { credentialId, profileId: profile.id };
}

/** true si otra empresa (distinta de `excludeId`) ya usa ese CUIT (único global: `company_compay_cuit_key`). */
async function isCuitTaken(cuit: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.company.findUnique({ where: { company_cuit: cuit }, select: { id: true } });
  return existing !== null && existing.id !== excludeId;
}

function logoFile(formData: FormData): File | null {
  const value = formData.get('logo');
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Sube el logo a `<companyId>/logo/logo.<ext>` (pisa el anterior) y guarda la URL pública en
 * `company_logo`. Se hace después de la transacción: si falla, la empresa ya quedó creada/editada
 * y se devuelve el error para que la UI lo informe.
 */
async function saveCompanyLogo(companyId: string, file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  const path = buildLogoPath(companyId, file.name);
  const uploaded = await storageUpload(LOGO_BUCKET, path, file, { upsert: true, cacheControl: '60' }); // P3: storage
  if (!uploaded.ok) return { ok: false, error: 'No se pudo subir el logo' };
  const publicUrl = await storagePublicUrl(LOGO_BUCKET, uploaded.data.path); // P3: storage
  await prisma.company.update({
    where: { id: companyId },
    data: { company_logo: `${publicUrl}?v=${Date.now()}` },
  });
  return { ok: true };
}

function toCompanyData(values: CompanyFormValues) {
  return {
    company_name: values.company_name,
    company_cuit: values.company_cuit,
    description: values.description,
    website: values.website,
    contact_email: values.contact_email,
    contact_phone: values.contact_phone,
    address: values.address,
    country: values.country,
    industry: values.industry,
    city: BigInt(values.city),
    province_id: BigInt(values.province_id),
    by_defect: values.by_defect,
  };
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Alta de empresa. `FormData` con los campos del formulario (+ `logo` opcional).
 * - `owner_id` = profile de sesión; se crea también la pertenencia en `share_company_users`.
 *   (el trigger `assign_owner_role_trigger`, que en teoría hacía esto en SQL y nunca llegó a
 *   hacerlo, se eliminó en la Task 13a: el alta del owner vive acá).
 *
 * - Rol: `user_roles` NO tiene `company_id` y `get_user_permissions` une sólo por `user_id`, así que
 *   todo rol asignado acá es GLOBAL (valdría en todas las empresas del usuario). Por eso el grant se
 *   limita al bootstrap: sólo si el usuario no pertenecía a ninguna otra empresa Y no tenía ningún
 *   rol — el caso de la PRIMERA empresa, donde no existe ningún admin que pueda darle permisos. Un
 *   usuario que ya pertenece a otra empresa o ya tiene un rol NO recibe nada al crear otra empresa:
 *   ése era el vector de escalación (crear una empresa descartable para volverse admin global).
 *   Task 13 agrega `user_roles.company_id` (+ unique y ajuste de `get_user_permissions`) y ahí el
 *   rol pasa a ser por empresa y esta excepción desaparece.
 */
export async function createCompany(formData: FormData): Promise<CompanyMutationResult> {
  const parsed = parseCompanyForm(formData);
  if (!parsed.ok) return { ok: false, error: 'Revisá los datos del formulario', fieldErrors: parsed.errors };

  try {
    const { credentialId, profileId } = await requireSessionProfile();
    if (await isCuitTaken(parsed.data.company_cuit)) {
      return { ok: false, error: 'Ya existe una compañía con este CUIT.', fieldErrors: { company_cuit: 'Ya existe una compañía con este CUIT.' } };
    }

    const companyId = await withActor(credentialId, async (tx) => {
      const company = await tx.company.create({
        data: { ...toCompanyData(parsed.data), owner_id: profileId, company_logo: '' },
        select: { id: true },
      });

      const membership = await tx.share_company_users.findFirst({
        where: { company_id: company.id, profile_id: profileId },
        select: { id: true },
      });
      if (!membership) {
        await tx.share_company_users.create({ data: { company_id: company.id, profile_id: profileId } });
      }

      // Bootstrap de la PRIMERA empresa: sin pertenencias previas ni roles, el usuario no tendría
      // ningún módulo visible y no existe un admin que pueda otorgarle permisos. El rol es global
      // (ver el comentario de arriba), por eso se otorga SÓLO en ese caso.
      const [previousMemberships, existingRoles] = await Promise.all([
        tx.share_company_users.count({ where: { profile_id: profileId, company_id: { not: company.id } } }),
        tx.user_roles.count({ where: { user_id: credentialId } }),
      ]);

      if (previousMemberships === 0 && existingRoles === 0) {
        const adminRole = await tx.roles.findFirst({ where: { slug: 'admin', is_system: true }, select: { id: true } });
        if (adminRole) {
          // `createMany` + `skipDuplicates`: con dos altas simultáneas del mismo usuario (doble
          // submit, dos pestañas) ambas leen 0 roles y la segunda chocaría con la unique
          // (user_id, role_id); un P2002 acá abortaría la transacción entera y la empresa no se
          // crearía. El rol no se duplica y el alta sigue adelante.
          await tx.user_roles.createMany({
            data: [{ user_id: credentialId, role_id: adminRole.id, assigned_by: credentialId }],
            skipDuplicates: true,
          });
          logger.info('Rol admin otorgado en el alta de la primera empresa del usuario', {
            data: { companyId: company.id, credentialId },
          });
        } else {
          logger.warn('Rol admin no encontrado: la primera empresa se creó sin rol para el owner', {
            data: { companyId: company.id },
          });
        }
      }

      return company.id;
    });

    const logo = logoFile(formData);
    if (logo) {
      const saved = await saveCompanyLogo(companyId, logo);
      if (!saved.ok) {
        logger.warn('Empresa creada pero el logo no se pudo guardar', { data: { companyId } });
      }
    }

    revalidatePath('/dashboard', 'layout');
    logger.info('Empresa creada', { data: { companyId } });
    return { ok: true, data: { id: companyId } };
  } catch (error) {
    logger.error('Error al crear la empresa', { data: { error } });
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo registrar la compañía' };
  }
}

/**
 * Edición de empresa. Sólo el owner o quien tenga `empresa.general.update` sobre esa empresa.
 * `logo` (File opcional) reemplaza el logo anterior.
 */
export async function updateCompany(companyId: string, formData: FormData): Promise<CompanyMutationResult> {
  const parsed = parseCompanyForm(formData);
  if (!parsed.ok) return { ok: false, error: 'Revisá los datos del formulario', fieldErrors: parsed.errors };

  try {
    await assertCompanyAccess(companyId);
    const { credentialId, profileId } = await requireSessionProfile();

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { owner_id: true } });
    if (!company) return { ok: false, error: 'Empresa no encontrada' };
    const isOwner = company.owner_id === profileId;
    if (!isOwner && !(await checkPermissionServer('empresa', 'general', 'update'))) {
      return { ok: false, error: 'No tenés permiso para editar esta empresa' };
    }

    if (await isCuitTaken(parsed.data.company_cuit, companyId)) {
      return { ok: false, error: 'Ya existe una compañía con este CUIT.', fieldErrors: { company_cuit: 'Ya existe una compañía con este CUIT.' } };
    }

    await withActor(credentialId, async (tx) => {
      await tx.company.update({ where: { id: companyId }, data: toCompanyData(parsed.data) });
    });

    const logo = logoFile(formData);
    if (logo) {
      const saved = await saveCompanyLogo(companyId, logo);
      if (!saved.ok) return { ok: false, error: 'Datos guardados, pero el logo no se pudo subir' };
    }

    revalidatePath('/dashboard', 'layout');
    logger.info('Empresa actualizada', { data: { companyId } });
    return { ok: true, data: { id: companyId } };
  } catch (error) {
    logger.error('Error al actualizar la empresa', { data: { error, companyId } });
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo actualizar la compañía' };
  }
}
