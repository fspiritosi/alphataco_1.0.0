'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

import type { ConflictCheckResult, ProcessingResult } from '../types/massive-diagram';

const logger = new Logger('features/Employees/Diagrams/massive');

// ─── Work Diagrams ──────────────────────────────────────────────────────────

export async function getActiveWorkDiagrams() {
  logger.debug('Fetching active work diagrams');

  try {
    const data = await prisma.work_diagram.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        active_working_days: true,
        inactive_working_days: true,
        inactive_novelty: true,
      },
      orderBy: { name: 'asc' },
    });

    return data.map((wd) => ({
      id: wd.id,
      name: wd.name,
      active_working_days: wd.active_working_days ? Number(wd.active_working_days) : null,
      inactive_working_days: wd.inactive_working_days ? Number(wd.inactive_working_days) : null,
      inactive_novelty: wd.inactive_novelty,
    }));
  } catch (error) {
    logger.error('Error fetching active work diagrams', { data: { error } });
    throw error;
  }
}

export type WorkDiagramItem = Awaited<ReturnType<typeof getActiveWorkDiagrams>>[number];

// ─── Novelties ──────────────────────────────────────────────────────────────

export async function getWorkDiagramNovelties(workDiagramId: string) {
  logger.debug('Fetching novelties for work diagram', { data: { workDiagramId } });

  try {
    const [workDiagram, activeNovelties] = await Promise.all([
      prisma.work_diagram.findUnique({
        where: { id: workDiagramId },
        select: {
          inactive_novelty: true,
          diagram_type: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
      prisma.work_diagram_active_novelties.findMany({
        where: { work_diagram_id: workDiagramId },
        select: {
          diagram_type_id: true,
          diagram_type: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
    ]);

    return {
      inactiveNovelty: workDiagram?.diagram_type ?? null,
      activeNovelties: activeNovelties.map((an) => ({
        diagram_type_id: an.diagram_type_id,
        name: an.diagram_type.name,
        color: an.diagram_type.color,
      })),
    };
  } catch (error) {
    logger.error('Error fetching novelties', { data: { error, workDiagramId } });
    throw error;
  }
}

export type NoveltyData = Awaited<ReturnType<typeof getWorkDiagramNovelties>>;
export type ActiveNoveltyItem = NoveltyData['activeNovelties'][number];

// ─── RPC Wrappers ───────────────────────────────────────────────────────────

export async function checkDiagramConflicts(params: {
  employeeIds: string[];
  workDiagramId: string;
  dateFrom: string;
  dateTo: string;
  activeNoveltyId?: string;
}) {
  logger.debug('Checking diagram conflicts', { data: { params } });

  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('check_diagram_conflicts_with_operations_v2', {
      p_employee_ids: params.employeeIds,
      p_work_diagram_id: params.workDiagramId,
      p_date_from: params.dateFrom,
      p_date_to: params.dateTo,
      p_active_novelty_id: params.activeNoveltyId || '',
    });

    if (error) {
      logger.error('Error checking diagram conflicts', { data: { error } });
      throw error;
    }

    return data as unknown as ConflictCheckResult;
  } catch (error) {
    logger.error('Error in checkDiagramConflicts', { data: { error } });
    throw error;
  }
}

export async function processMassiveDiagramCreation(params: {
  employeeIds: string[];
  workDiagramId: string;
  activeNoveltyId: string;
  dateFrom: string;
  dateTo: string;
  conflictResolution: 'skip' | 'update';
}) {
  logger.debug('Processing massive diagram creation', { data: { params } });

  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('process_massive_diagram_creation_v2', {
      p_employee_ids: params.employeeIds,
      p_work_diagram_id: params.workDiagramId,
      p_active_novelty_id: params.activeNoveltyId,
      p_date_from: params.dateFrom,
      p_date_to: params.dateTo,
      p_conflict_resolution: params.conflictResolution,
    });

    if (error) {
      logger.error('Error processing massive diagram creation', { data: { error } });
      throw error;
    }

    return data as unknown as ProcessingResult;
  } catch (error) {
    logger.error('Error in processMassiveDiagramCreation', { data: { error } });
    throw error;
  }
}
