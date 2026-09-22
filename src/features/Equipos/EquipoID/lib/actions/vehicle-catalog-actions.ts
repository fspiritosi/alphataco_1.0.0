'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Equipos/vehicle-catalog-actions');

/**
 * Catálogos de la ficha de vehículos/equipamientos. Los catálogos globales (marcas, tipos,
 * subtipos, propietarios con `company_id NULL`) se leen junto a los propios de la empresa
 * activa: `OR: [{ company_id }, { company_id: null }]` (mismo patrón que Fase 3).
 */
function companyOrGlobal(companyId: string) {
  return { OR: [{ company_id: companyId }, { company_id: null }] };
}

export async function getVehicleBrands() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.brand_vehicles.findMany({
      where: { ...companyOrGlobal(companyId), is_active: true },
      select: { id: true, name: true, is_active: true, company_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching vehicle brands', { data: { error } });
    return [];
  }
}

export async function getVehicleModels() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.model_vehicles.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, name: true, brand: true, is_active: true, company_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching vehicle models', { data: { error } });
    return [];
  }
}

export async function getVehicleOwners() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.equipment_owners.findMany({
      where: { ...companyOrGlobal(companyId), is_active: true },
      select: {
        id: true,
        name: true,
        cuit: true,
        contract_type: true,
        is_active: true,
        company_id: true,
        equipment_owner_contract_types: { select: { contract_type: true } },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching vehicle owners', { data: { error } });
    return [];
  }
}
export type getVehicleOwnersType = Awaited<ReturnType<typeof getVehicleOwners>>;

export async function getVehicleTypes(appliesTo?: 'vehicle' | 'other_equipment') {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.type.findMany({
      where: { ...companyOrGlobal(companyId), is_active: true, ...(appliesTo ? { applies_to: appliesTo } : {}) },
      select: {
        id: true,
        name: true,
        is_active: true,
        company_id: true,
        has_hitch: true,
        is_tractor_unit: true,
        applies_to: true,
        generates_qr: true,
        is_operative: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching vehicle types', { data: { error } });
    return [];
  }
}

/** Catálogo global (sin empresa). `id` es bigint en la base: se devuelve como number. */
export async function getTypesOfVehicles() {
  try {
    const rows = await prisma.types_of_vehicles.findMany({
      where: { is_active: true },
      select: { id: true, name: true, is_active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  } catch (error) {
    logger.error('Error fetching types of vehicles', { data: { error } });
    return [];
  }
}

export async function getVehicleSubTypes() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.sub_type.findMany({
      where: { ...companyOrGlobal(companyId), is_active: true },
      select: { id: true, name: true, type: true, is_active: true, company_id: true, tire_template_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching vehicle sub types', { data: { error } });
    return [];
  }
}

export async function getModelsByBrand(brandId: number) {
  if (!brandId) return [];
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.model_vehicles.findMany({
      where: withCompany({ brand: brandId, is_active: true }, companyId),
      select: { id: true, name: true, brand: true, is_active: true, company_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching models by brand', { data: { error, brandId } });
    return [];
  }
}

export async function getSubTypesByType(typeId: string) {
  if (!typeId) return [];
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.sub_type.findMany({
      where: { ...companyOrGlobal(companyId), type: typeId, is_active: true },
      select: { id: true, name: true, type: true, is_active: true, company_id: true, tire_template_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching sub types by type', { data: { error, typeId } });
    return [];
  }
}

export async function getHierarchicalPositions() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.hierarchy.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching hierarchical positions', { data: { error } });
    return [];
  }
}
