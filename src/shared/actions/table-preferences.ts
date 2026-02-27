'use server';

import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

type TablePref = {
  columnVisibility?: Record<string, boolean>;
  filterVisibility?: Record<string, boolean>;
};

type AllTablePrefs = Record<string, TablePref>;

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getTablePreferences(tableId: string): Promise<TablePref> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const pref = await prisma.user_table_preferences.findUnique({
      where: { user_id: tableId ? `${userId}:${tableId}` : userId },
      select: { preferences: true },
    });

    if (!pref?.preferences) return {};
    return pref.preferences as TablePref;
  } catch (error) {
    logger.error('Error getting table preferences', { data: { error, tableId } });
    return {};
  }
}

export async function saveTableColumnVisibility(
  tableId: string,
  columnVisibility: Record<string, boolean>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${userId}:${tableId}`;
    const existing = await prisma.user_table_preferences.findUnique({
      where: { user_id: key },
      select: { preferences: true },
    });

    const currentPrefs = (existing?.preferences as TablePref) ?? {};
    const updatedPrefs: TablePref = { ...currentPrefs, columnVisibility };

    await prisma.user_table_preferences.upsert({
      where: { user_id: key },
      create: { user_id: key, preferences: updatedPrefs },
      update: { preferences: updatedPrefs },
    });
  } catch (error) {
    logger.error('Error saving column visibility', { data: { error, tableId } });
  }
}

export async function saveTableFilterVisibility(
  tableId: string,
  filterVisibility: Record<string, boolean>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${userId}:${tableId}`;
    const existing = await prisma.user_table_preferences.findUnique({
      where: { user_id: key },
      select: { preferences: true },
    });

    const currentPrefs = (existing?.preferences as TablePref) ?? {};
    const updatedPrefs: TablePref = { ...currentPrefs, filterVisibility };

    await prisma.user_table_preferences.upsert({
      where: { user_id: key },
      create: { user_id: key, preferences: updatedPrefs },
      update: { preferences: updatedPrefs },
    });
  } catch (error) {
    logger.error('Error saving filter visibility', { data: { error, tableId } });
  }
}
