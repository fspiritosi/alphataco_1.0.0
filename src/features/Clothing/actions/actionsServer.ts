'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const logger = new Logger('features/Clothing');

// ============================================================================
// AUTH — CLOTHING ROUTE
// ============================================================================

/**
 * Authenticates a user for the /clothing standalone route.
 * Only requires the user to have a linked employee (no workshop_sector_id needed).
 * Sets the actualComp cookie with the employee's company_id.
 */
export async function clothingLogin(email: string, password: string) {
  const supabase = await supabaseServer();

  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn('Clothing login auth failed', { data: { email } });
    return { error: error.message };
  }

  if (!authData.user) {
    return { error: 'No se pudo autenticar' };
  }

  // Use Prisma for profile and employee lookups
  const profile = await prisma.profile.findUnique({
    where: { id: authData.user.id },
    select: { employee_id: true },
  });

  if (!profile?.employee_id) {
    await supabase.auth.signOut();
    return { error: 'Tu usuario no tiene un empleado vinculado. Contacta al administrador.' };
  }

  const employee = await prisma.employees.findUnique({
    where: { id: profile.employee_id },
    select: { id: true, company_id: true },
  });

  if (!employee) {
    await supabase.auth.signOut();
    return { error: 'No se encontro el empleado vinculado. Contacta al administrador.' };
  }

  // Set company cookie (1-year expiry)
  if (employee.company_id) {
    const cookieStore = await cookies();
    cookieStore.set('actualComp', employee.company_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  logger.info('Clothing login successful', { data: { userId: authData.user.id } });
  return { success: true };
}

/**
 * Signs out the current user and redirects to the clothing login page.
 */
export async function clothingLogout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete('actualComp');
  revalidatePath('/', 'layout');
  redirect('/clothing/login');
}

/**
 * Gets the clothing operator context from the current session.
 * Returns null if the user is not authenticated or has no linked employee.
 */
export async function getClothingOperatorContext() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { employee_id: true },
  });

  if (!profile?.employee_id) return null;

  const employee = await prisma.employees.findUnique({
    where: { id: profile.employee_id },
    select: { id: true, firstname: true, lastname: true, file: true, company_id: true },
  });

  if (!employee?.company_id) return null;

  return {
    userId: user.id,
    employeeId: employee.id,
    employeeName: `${employee.lastname} ${employee.firstname}`.trim(),
    employeeFile: employee.file,
    companyId: employee.company_id,
  };
}

export type ClothingOperatorContext = NonNullable<Awaited<ReturnType<typeof getClothingOperatorContext>>>;

// ============================================================================
// BRANDS
// ============================================================================

/**
 * Creates a new clothing brand for the current company.
 */
export async function createClothingBrand(name: string) {
  const companyId = await getServerCompanyId();
  logger.debug('Creating clothing brand', { data: { name, companyId } });

  try {
    const brand = await prisma.clothing_brands.create({
      data: {
        name,
        company_id: companyId,
      },
    });
    return brand;
  } catch (error) {
    logger.error('Error creating clothing brand', { data: { error, name } });
    throw error;
  }
}

/**
 * Updates the name of an existing clothing brand.
 */
export async function updateClothingBrand(id: string, name: string) {
  logger.debug('Updating clothing brand', { data: { id, name } });

  try {
    const brand = await prisma.clothing_brands.update({
      where: { id },
      data: { name, updated_at: new Date() },
    });
    return brand;
  } catch (error) {
    logger.error('Error updating clothing brand', { data: { error, id, name } });
    throw error;
  }
}

/**
 * Toggles the active status of a clothing brand.
 */
export async function toggleClothingBrandActive(id: string, isActive: boolean) {
  logger.debug('Toggling clothing brand active status', { data: { id, isActive } });

  try {
    const brand = await prisma.clothing_brands.update({
      where: { id },
      data: { is_active: isActive, updated_at: new Date() },
    });
    return brand;
  } catch (error) {
    logger.error('Error toggling clothing brand active status', { data: { error, id, isActive } });
    throw error;
  }
}

// ============================================================================
// SIZES
// ============================================================================

/**
 * Creates a new clothing size for the current company.
 */
export async function createClothingSize(name: string) {
  const companyId = await getServerCompanyId();
  logger.debug('Creating clothing size', { data: { name, companyId } });

  try {
    const size = await prisma.clothing_sizes.create({
      data: {
        name,
        company_id: companyId,
      },
    });
    return size;
  } catch (error) {
    logger.error('Error creating clothing size', { data: { error, name } });
    throw error;
  }
}

/**
 * Updates the name of an existing clothing size.
 */
export async function updateClothingSize(id: string, name: string) {
  logger.debug('Updating clothing size', { data: { id, name } });

  try {
    const size = await prisma.clothing_sizes.update({
      where: { id },
      data: { name, updated_at: new Date() },
    });
    return size;
  } catch (error) {
    logger.error('Error updating clothing size', { data: { error, id, name } });
    throw error;
  }
}

/**
 * Toggles the active status of a clothing size.
 */
export async function toggleClothingSizeActive(id: string, isActive: boolean) {
  logger.debug('Toggling clothing size active status', { data: { id, isActive } });

  try {
    const size = await prisma.clothing_sizes.update({
      where: { id },
      data: { is_active: isActive, updated_at: new Date() },
    });
    return size;
  } catch (error) {
    logger.error('Error toggling clothing size active status', { data: { error, id, isActive } });
    throw error;
  }
}

// ============================================================================
// ITEMS
// ============================================================================

/**
 * Creates a new clothing item for the current company.
 */
export async function createClothingItem(data: { name: string; code?: string; description?: string }) {
  const companyId = await getServerCompanyId();
  logger.debug('Creating clothing item', { data: { name: data.name, companyId } });

  try {
    const item = await prisma.clothing_items.create({
      data: {
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        company_id: companyId,
      },
    });
    return item;
  } catch (error) {
    logger.error('Error creating clothing item', { data: { error, itemData: data } });
    throw error;
  }
}

/**
 * Updates the fields of an existing clothing item.
 */
export async function updateClothingItem(id: string, data: { name: string; code?: string; description?: string }) {
  logger.debug('Updating clothing item', { data: { id, name: data.name } });

  try {
    const item = await prisma.clothing_items.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        updated_at: new Date(),
      },
    });
    return item;
  } catch (error) {
    logger.error('Error updating clothing item', { data: { error, id, itemData: data } });
    throw error;
  }
}

/**
 * Toggles the active status of a clothing item.
 */
export async function toggleClothingItemActive(id: string, isActive: boolean) {
  logger.debug('Toggling clothing item active status', { data: { id, isActive } });

  try {
    const item = await prisma.clothing_items.update({
      where: { id },
      data: { is_active: isActive, updated_at: new Date() },
    });
    return item;
  } catch (error) {
    logger.error('Error toggling clothing item active status', { data: { error, id, isActive } });
    throw error;
  }
}

// ============================================================================
// ITEM BRAND SIZES (pivot)
// ============================================================================

/**
 * Returns all brand-size combinations associated with a clothing item,
 * including the brand and size names for display.
 */
export async function getItemBrandSizes(itemId: string) {
  logger.debug('Getting item brand sizes', { data: { itemId } });

  try {
    const entries = await prisma.clothing_item_brand_sizes.findMany({
      where: { clothing_item_id: itemId },
      include: {
        clothing_brands: { select: { id: true, name: true } },
        clothing_sizes: { select: { id: true, name: true } },
      },
      orderBy: [{ clothing_brands: { name: 'asc' } }, { clothing_sizes: { name: 'asc' } }],
    });
    return entries;
  } catch (error) {
    logger.error('Error getting item brand sizes', { data: { error, itemId } });
    throw error;
  }
}

/**
 * Replaces all brand-size entries for a given clothing item in a single transaction.
 * Deletes all existing entries for the item, then inserts the new set.
 */
export async function setItemBrandSizes(itemId: string, entries: { brandId: string; sizeId: string }[]) {
  logger.debug('Setting item brand sizes', { data: { itemId, count: entries.length } });

  try {
    await prisma.$transaction([
      prisma.clothing_item_brand_sizes.deleteMany({
        where: { clothing_item_id: itemId },
      }),
      prisma.clothing_item_brand_sizes.createMany({
        data: entries.map((e) => ({
          clothing_item_id: itemId,
          clothing_brand_id: e.brandId,
          clothing_size_id: e.sizeId,
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

/**
 * Returns all active clothing brands for the current company, ordered by name.
 * Intended for use in comboboxes and selectors.
 */
export async function getActiveClothingBrands() {
  const companyId = await getServerCompanyId();
  logger.debug('Getting active clothing brands', { data: { companyId } });

  try {
    const brands = await prisma.clothing_brands.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return brands;
  } catch (error) {
    logger.error('Error getting active clothing brands', { data: { error } });
    throw error;
  }
}

/**
 * Returns all active clothing sizes for the current company, ordered by name.
 * Intended for use in comboboxes and selectors.
 */
export async function getActiveClothingSizes() {
  const companyId = await getServerCompanyId();
  logger.debug('Getting active clothing sizes', { data: { companyId } });

  try {
    const sizes = await prisma.clothing_sizes.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return sizes;
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
