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
 * - El trigger `assign_owner_role_trigger` (prisma/sql/permissions.sql) sólo actúa si existe el rol
 *   `slug='owner'`; el seed no lo crea, así que la pertenencia se inserta acá (sin duplicarla).
 *
 * No se asigna rol acá: `user_roles` no tiene `company_id`, así que cualquier rol sería global.
 * Task 13 agrega `user_roles.company_id` (+ unique y ajuste de `get_user_permissions`) y recién
 * entonces se puede otorgar `admin` de la empresa creada. Hoy el alta de roles la hace un admin
 * existente desde el editor de permisos.
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
