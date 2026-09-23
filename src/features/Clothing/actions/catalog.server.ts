'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import {
  assertBrandSizePairsInCompany,
  assertClothingBrandInCompany,
  assertClothingItemInCompany,
  assertClothingSizeInCompany,
} from './perimeter';

const logger = new Logger('features/Clothing/catalog');

// ============================================================================
// BRANDS
// ============================================================================

/** Crea una marca de ropa en la empresa activa. */
export async function createClothingBrand(name: string) {
  const companyId = await getActiveCompanyId();
  logger.debug('Creating clothing brand', { data: { name, companyId } });

  try {
    return await prisma.clothing_brands.create({ data: { name, company_id: companyId } });
  } catch (error) {
    logger.error('Error creating clothing brand', { data: { error, name } });
    throw error;
  }
}

/**
 * Renombra una marca de ropa.
 * Perímetro: la marca tiene que ser de la empresa activa; antes se escribía por id suelto.
 */
export async function updateClothingBrand(id: string, name: string) {
  const companyId = await getActiveCompanyId();
  logger.debug('Updating clothing brand', { data: { id, name } });

  try {
    await assertClothingBrandInCompany(id, companyId);
    return await prisma.clothing_brands.update({ where: { id }, data: { name, updated_at: new Date() } });
  } catch (error) {
    logger.error('Error updating clothing brand', { data: { error, id, name } });
    throw error;
  }
}

/** Activa/desactiva una marca de ropa de la empresa activa. */
export async function toggleClothingBrandActive(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();
  logger.debug('Toggling clothing brand active status', { data: { id, isActive } });

  try {
    await assertClothingBrandInCompany(id, companyId);
    return await prisma.clothing_brands.update({ where: { id }, data: { is_active: isActive, updated_at: new Date() } });
  } catch (error) {
    logger.error('Error toggling clothing brand active status', { data: { error, id, isActive } });
    throw error;
  }
}

// ============================================================================
// SIZES
// ============================================================================

/** Crea un talle de ropa en la empresa activa. */
export async function createClothingSize(name: string) {
  const companyId = await getActiveCompanyId();
  logger.debug('Creating clothing size', { data: { name, companyId } });

  try {
    return await prisma.clothing_sizes.create({ data: { name, company_id: companyId } });
  } catch (error) {
    logger.error('Error creating clothing size', { data: { error, name } });
    throw error;
  }
}

/** Renombra un talle de ropa de la empresa activa. */
export async function updateClothingSize(id: string, name: string) {
  const companyId = await getActiveCompanyId();
  logger.debug('Updating clothing size', { data: { id, name } });

  try {
    await assertClothingSizeInCompany(id, companyId);
    return await prisma.clothing_sizes.update({ where: { id }, data: { name, updated_at: new Date() } });
  } catch (error) {
    logger.error('Error updating clothing size', { data: { error, id, name } });
    throw error;
  }
}

/** Activa/desactiva un talle de ropa de la empresa activa. */
export async function toggleClothingSizeActive(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();
  logger.debug('Toggling clothing size active status', { data: { id, isActive } });

  try {
    await assertClothingSizeInCompany(id, companyId);
    return await prisma.clothing_sizes.update({ where: { id }, data: { is_active: isActive, updated_at: new Date() } });
  } catch (error) {
    logger.error('Error toggling clothing size active status', { data: { error, id, isActive } });
    throw error;
  }
}

// ============================================================================
// ITEMS
// ============================================================================

/** Crea un artículo de ropa en la empresa activa. */
export async function createClothingItem(data: { name: string; code?: string; description?: string }) {
  const companyId = await getActiveCompanyId();
  logger.debug('Creating clothing item', { data: { name: data.name, companyId } });

  try {
    return await prisma.clothing_items.create({
      data: {
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        company_id: companyId,
      },
    });
  } catch (error) {
    logger.error('Error creating clothing item', { data: { error, itemData: data } });
    throw error;
  }
}

/** Edita un artículo de ropa de la empresa activa. */
export async function updateClothingItem(id: string, data: { name: string; code?: string; description?: string }) {
  const companyId = await getActiveCompanyId();
  logger.debug('Updating clothing item', { data: { id, name: data.name } });

  try {
    await assertClothingItemInCompany(id, companyId);
    return await prisma.clothing_items.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error updating clothing item', { data: { error, id, itemData: data } });
    throw error;
  }
}

/** Activa/desactiva un artículo de ropa de la empresa activa. */
export async function toggleClothingItemActive(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();
  logger.debug('Toggling clothing item active status', { data: { id, isActive } });

  try {
    await assertClothingItemInCompany(id, companyId);
    return await prisma.clothing_items.update({ where: { id }, data: { is_active: isActive, updated_at: new Date() } });
  } catch (error) {
    logger.error('Error toggling clothing item active status', { data: { error, id, isActive } });
    throw error;
  }
}

// ============================================================================
// ITEM BRAND SIZES (pivot)
// ============================================================================

/**
 * Combinaciones marca/talle de un artículo, con los nombres para mostrar.
 * Perímetro: el artículo tiene que ser de la empresa activa.
 */
export async function getItemBrandSizes(itemId: string) {
  const companyId = await getActiveCompanyId();
  logger.debug('Getting item brand sizes', { data: { itemId } });

  try {
    await assertClothingItemInCompany(itemId, companyId);

    return await prisma.clothing_item_brand_sizes.findMany({
      where: { clothing_item_id: itemId },
      include: {
        clothing_brands: { select: { id: true, name: true } },
        clothing_sizes: { select: { id: true, name: true } },
      },
      orderBy: [{ clothing_brands: { name: 'asc' } }, { clothing_sizes: { name: 'asc' } }],
    });
  } catch (error) {
    logger.error('Error getting item brand sizes', { data: { error, itemId } });
    throw error;
  }
}

/**
 * Reemplaza en una transacción el set completo de marcas/talles de un artículo.
 *
 * Perímetro: el artículo y TODOS los pares marca/talle tienen que ser de la empresa
 * activa. Si alguno no lo es, la operación falla entera en vez de guardar una parte: el
 * formulario sólo ofrece opciones propias, así que un par ajeno es manipulación, y un
 * guardado parcial dejaría al usuario creyendo que se grabó lo que mandó.
 */
export async function setItemBrandSizes(itemId: string, entries: { brandId: string; sizeId: string }[]) {
  const companyId = await getActiveCompanyId();
  logger.debug('Setting item brand sizes', { data: { itemId, count: entries.length } });

  try {
    await assertClothingItemInCompany(itemId, companyId);
    await assertBrandSizePairsInCompany(entries, companyId);

    await prisma.$transaction([
      prisma.clothing_item_brand_sizes.deleteMany({ where: { clothing_item_id: itemId } }),
      prisma.clothing_item_brand_sizes.createMany({
        data: entries.map((entry) => ({
          clothing_item_id: itemId,
          clothing_brand_id: entry.brandId,
          clothing_size_id: entry.sizeId,
        })),
        skipDuplicates: true,
      }),
    ]);
  } catch (error) {
    logger.error('Error setting item brand sizes', { data: { error, itemId } });
    throw error;
  }
}

// ============================================================================
// LISTS FOR COMBOBOXES
// ============================================================================

/** Marcas activas de la empresa activa, para los selectores. */
export async function getActiveClothingBrands() {
  const companyId = await getActiveCompanyId();
  logger.debug('Getting active clothing brands', { data: { companyId } });

  try {
    return await prisma.clothing_brands.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error getting active clothing brands', { data: { error } });
    throw error;
  }
}

/** Talles activos de la empresa activa, para los selectores. */
export async function getActiveClothingSizes() {
  const companyId = await getActiveCompanyId();
  logger.debug('Getting active clothing sizes', { data: { companyId } });

  try {
    return await prisma.clothing_sizes.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error getting active clothing sizes', { data: { error } });
    throw error;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type ClothingBrand = Awaited<ReturnType<typeof createClothingBrand>>;
export type ClothingSize = Awaited<ReturnType<typeof createClothingSize>>;
export type ClothingItem = Awaited<ReturnType<typeof createClothingItem>>;

export type ItemBrandSizeEntry = Awaited<ReturnType<typeof getItemBrandSizes>>[number];

export type ActiveClothingBrand = Awaited<ReturnType<typeof getActiveClothingBrands>>[number];
export type ActiveClothingSize = Awaited<ReturnType<typeof getActiveClothingSizes>>[number];
