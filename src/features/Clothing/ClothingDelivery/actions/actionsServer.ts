'use server';

import type { clothing_delivery_type } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Clothing/Delivery');

// ============================================================================
// EMPLOYEES
// ============================================================================

/**
 * Searches active employees of the given company for the delivery combobox.
 * Returns up to 50 results matching the search string.
 */
export async function getEmployeesForDelivery(companyId: string, search?: string) {
  logger.debug('Getting employees for delivery', { data: { companyId, search } });

  try {
    const employees = await prisma.employees.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        ...(search && search.trim().length > 0
          ? {
              OR: [
                { firstname: { contains: search, mode: 'insensitive' } },
                { lastname: { contains: search, mode: 'insensitive' } },
                { file: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        file: true,
        cuil: true,
        company_positions: { select: { name: true } },
      },
      orderBy: { lastname: 'asc' },
      take: 50,
    });

    return employees;
  } catch (error) {
    logger.error('Error getting employees for delivery', { data: { error, companyId } });
    throw error;
  }
}

export type EmployeeForDelivery = Awaited<ReturnType<typeof getEmployeesForDelivery>>[number];

// ============================================================================
// ITEMS
// ============================================================================

/**
 * Returns all active clothing items for the given company.
 */
export async function getItemsForDelivery(companyId: string) {
  logger.debug('Getting items for delivery', { data: { companyId } });

  try {
    const items = await prisma.clothing_items.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return items;
  } catch (error) {
    logger.error('Error getting items for delivery', { data: { error, companyId } });
    throw error;
  }
}

export type ItemForDelivery = Awaited<ReturnType<typeof getItemsForDelivery>>[number];

// ============================================================================
// BRANDS FOR ITEM
// ============================================================================

/**
 * Returns distinct brands that have at least one size configured for the given item.
 */
export async function getBrandsForItem(itemId: string) {
  logger.debug('Getting brands for item', { data: { itemId } });

  try {
    const entries = await prisma.clothing_item_brand_sizes.findMany({
      where: { clothing_item_id: itemId },
      select: {
        clothing_brands: { select: { id: true, name: true } },
      },
      distinct: ['clothing_brand_id'],
      orderBy: { clothing_brands: { name: 'asc' } },
    });

    return entries.map((e) => e.clothing_brands);
  } catch (error) {
    logger.error('Error getting brands for item', { data: { error, itemId } });
    throw error;
  }
}

export type BrandForItem = Awaited<ReturnType<typeof getBrandsForItem>>[number];

// ============================================================================
// SIZES FOR ITEM + BRAND
// ============================================================================

/**
 * Returns sizes available for a specific item+brand combination.
 */
export async function getSizesForItemBrand(itemId: string, brandId: string) {
  logger.debug('Getting sizes for item+brand', { data: { itemId, brandId } });

  try {
    const entries = await prisma.clothing_item_brand_sizes.findMany({
      where: { clothing_item_id: itemId, clothing_brand_id: brandId },
      select: {
        clothing_sizes: { select: { id: true, name: true } },
      },
      orderBy: { clothing_sizes: { name: 'asc' } },
    });

    return entries.map((e) => e.clothing_sizes);
  } catch (error) {
    logger.error('Error getting sizes for item+brand', { data: { error, itemId, brandId } });
    throw error;
  }
}

export type SizeForItemBrand = Awaited<ReturnType<typeof getSizesForItemBrand>>[number];

// ============================================================================
// CREATE DELIVERY
// ============================================================================

export type CreateDeliveryInput = {
  employeeId: string;
  deliveredById: string;
  deliveryType: string;
  signatureUrl?: string;
  notes?: string;
  deliveredAt: string;
  companyId: string;
  items: {
    clothingItemId: string;
    clothingBrandId?: string;
    clothingSizeId?: string;
    quantity: number;
  }[];
};

/**
 * Creates a clothing delivery with its items in a single transaction.
 */
export async function createClothingDelivery(data: CreateDeliveryInput) {
  logger.debug('Creating clothing delivery', {
    data: { employeeId: data.employeeId, itemCount: data.items.length },
  });

  try {
    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.clothing_deliveries.create({
        data: {
          employee_id: data.employeeId,
          delivered_by_id: data.deliveredById,
          delivery_type: data.deliveryType as clothing_delivery_type,
          signature_url: data.signatureUrl ?? null,
          notes: data.notes ?? null,
          delivered_at: new Date(data.deliveredAt),
          company_id: data.companyId,
          clothing_delivery_items: {
            createMany: {
              data: data.items.map((item) => ({
                clothing_item_id: item.clothingItemId,
                clothing_brand_id: item.clothingBrandId ?? null,
                clothing_size_id: item.clothingSizeId ?? null,
                quantity: item.quantity,
              })),
            },
          },
        },
        include: {
          clothing_delivery_items: true,
        },
      });

      return created;
    });

    logger.info('Clothing delivery created', { data: { deliveryId: delivery.id } });
    return delivery;
  } catch (error) {
    logger.error('Error creating clothing delivery', { data: { error } });
    throw error;
  }
}

export type ClothingDeliveryCreated = Awaited<ReturnType<typeof createClothingDelivery>>;

// ============================================================================
// UPLOAD SIGNATURE
// ============================================================================

/**
 * Uploads a base64 signature image to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadSignatureImage(base64Data: string, companyId: string) {
  logger.debug('Uploading signature image', { data: { companyId } });

  try {
    // Strip the data URL prefix if present (e.g. "data:image/png;base64,...")
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64, 'base64');
    const fileName = `${companyId}/${Date.now()}-signature.png`;

    const supabase = await supabaseServer();

    const { error } = await supabase.storage.from('clothing-signatures').upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: false,
    });

    if (error) {
      logger.error('Error uploading signature to storage', { data: { error } });
      throw new Error(error.message);
    }

    const { data: urlData } = supabase.storage.from('clothing-signatures').getPublicUrl(fileName);

    logger.info('Signature uploaded successfully', { data: { url: urlData.publicUrl } });
    return { url: urlData.publicUrl };
  } catch (error) {
    logger.error('Error uploading signature image', { data: { error } });
    throw error;
  }
}
