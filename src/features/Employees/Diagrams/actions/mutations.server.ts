'use server';

import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Employees/Diagrams/mutations');

/**
 * Novedad a insertar. El comentario es opcional y se guarda por día:
 * una carga sobre un rango replica el mismo texto en cada día, salvo los
 * días que el usuario haya personalizado.
 */
export interface DiagramInsert {
  employee_id: string;
  diagram_type: string;
  day: number;
  month: number;
  year: number;
  comments?: string | null;
}

export interface DiagramUpdate {
  diagramId: string;
  diagram_type: string;
  /** Sólo se pisa cuando viene definido, para no borrar el comentario existente. */
  comments?: string | null;
}

async function requireActor(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sesión requerida');
  return userId;
}

/** Ids de `diagram_type` que pertenecen a la empresa activa (perímetro sin RLS). */
async function assertDiagramTypesOwned(tx: Prisma.TransactionClient, ids: string[], companyId: string) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const owned = await tx.diagram_type.count({ where: { id: { in: unique }, company_id: companyId } });
  if (owned !== unique.length) throw new Error('Tipo de novedad inválido para la empresa activa');
}

/**
 * Crea novedades por día. Los días que ya tienen registro (unique empleado+fecha) se omiten,
 * igual que antes, cuando cada INSERT fallaba por separado sin abortar el resto.
 * Las mutaciones corren con el actor seteado: los triggers de `diagrams_logs` leen `app.user_id`.
 */
export async function CreateDiagrams(diagramData: DiagramInsert[]): Promise<{ count: number }> {
  if (diagramData.length === 0) return { count: 0 };
  const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);

  try {
    return await withActor(actor, async (tx) => {
      const employeeIds = [...new Set(diagramData.map((d) => d.employee_id))];
      const ownedEmployees = await tx.employees.count({ where: { id: { in: employeeIds }, company_id: companyId } });
      if (ownedEmployees !== employeeIds.length) throw new Error('Empleado inválido para la empresa activa');
      await assertDiagramTypesOwned(
        tx,
        diagramData.map((d) => d.diagram_type),
        companyId
      );

      const result = await tx.employees_diagram.createMany({
        data: diagramData.map((d) => ({
          employee_id: d.employee_id,
          diagram_type: d.diagram_type,
          day: d.day,
          month: d.month,
          year: d.year,
          comments: d.comments ?? null,
        })),
        skipDuplicates: true,
      });
      return { count: result.count };
    });
  } catch (error) {
    logger.error('Error al crear novedades', { data: { error, rows: diagramData.length } });
    throw error;
  }
}

/** Cambia la novedad (y opcionalmente el comentario) de registros existentes de la empresa activa. */
export async function UpdateDiagramsById(diagramData: DiagramUpdate[]): Promise<{ count: number }> {
  if (diagramData.length === 0) return { count: 0 };
  const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);

  try {
    return await withActor(actor, async (tx) => {
      await assertDiagramTypesOwned(
        tx,
        diagramData.map((d) => d.diagram_type),
        companyId
      );

      let count = 0;
      for (const { diagramId, diagram_type, comments } of diagramData) {
        const payload: { diagram_type: string; comments?: string | null } = { diagram_type };
        if (comments !== undefined) payload.comments = comments;

        const updated = await tx.employees_diagram.updateMany({
          where: { id: diagramId, employees: { company_id: companyId } },
          data: payload,
        });
        count += updated.count;
      }
      return { count };
    });
  } catch (error) {
    logger.error('Error al actualizar novedades', { data: { error, rows: diagramData.length } });
    throw error;
  }
}
