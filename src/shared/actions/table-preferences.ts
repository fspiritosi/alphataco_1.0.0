'use server';

import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { TablePreferences } from '@/shared/components/common/DataTable/helpers';
import type { SortItem } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

type TablePref = TablePreferences;

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Mergea un patch sobre las preferencias guardadas de la tabla, conservando el resto.
 * Centraliza el read-modify-write para que cada preferencia no pise a las demás.
 */
async function mergeTablePreferences(tableId: string, patch: TablePref): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const key = `${userId}:${tableId}`;
  const existing = await prisma.user_table_preferences.findUnique({
    where: { user_id: key },
    select: { preferences: true },
  });

  const currentPrefs = (existing?.preferences as TablePref) ?? {};
  const updatedPrefs: TablePref = { ...currentPrefs, ...patch };

  await prisma.user_table_preferences.upsert({
    where: { user_id: key },
    create: { user_id: key, preferences: updatedPrefs },
    update: { preferences: updatedPrefs },
  });
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
    await mergeTablePreferences(tableId, { columnVisibility });
  } catch (error) {
    logger.error('Error saving column visibility', { data: { error, tableId } });
  }
}

export async function saveTableFilterVisibility(
  tableId: string,
  filterVisibility: Record<string, boolean>
): Promise<void> {
  try {
    await mergeTablePreferences(tableId, { filterVisibility });
  } catch (error) {
    logger.error('Error saving filter visibility', { data: { error, tableId } });
  }
}

/**
 * Persiste la vista de la tabla (filas por página y ordenamiento) para el usuario actual.
 * Se guarda para que al volver a entrar la tabla se vea igual que la última vez,
 * sin depender de que la URL conserve los params.
 */
export async function saveTableViewPreferences(
  tableId: string,
  view: { pageSize: number; sorting: SortItem[] }
): Promise<void> {
  try {
    await mergeTablePreferences(tableId, { pageSize: view.pageSize, sorting: view.sorting });
  } catch (error) {
    logger.error('Error saving table view preferences', { data: { error, tableId } });
  }
}
