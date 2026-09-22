'use server';

import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import type { DependencyConfig } from './DependencyValidationModal';

const logger = new Logger('shared/dependencies');

/**
 * Tablas donde se buscan dependencias antes de desactivar un catálogo, y las columnas FK
 * admitidas. Lista cerrada: el nombre de tabla/columna viaja desde el cliente y termina en
 * una query, así que nunca se acepta un valor fuera de esta lista.
 */
const DEPENDENCY_TARGETS = {
  employees: ['company_position', 'workflow_diagram', 'type_of_contract', 'hierarchical_position', 'guild_id'],
  vehicles: ['owner_id', 'subType', 'type', 'brand', 'model', 'type_of_vehicle'],
} as const;

export type DependencyTargetTable = keyof typeof DEPENDENCY_TARGETS;
export type DependencyTargetColumn<T extends DependencyTargetTable> = (typeof DEPENDENCY_TARGETS)[T][number];

/** Catálogos que ofrecen "reemplazar por" al desactivar; todos tienen `id`, `name`, `is_active`, `company_id`. */
const REPLACEMENT_SOURCES = {
  company_positions: 'company_positions',
  work_diagram: 'work_diagram',
  types_of_contract: 'types_of_contract',
  equipment_owners: 'equipment_owners',
  sub_type: 'sub_type',
  type: 'type',
} as const;

export type ReplacementSourceTable = keyof typeof REPLACEMENT_SOURCES;

export interface FetchDependenciesParams<T extends DependencyTargetTable, C extends string, Select extends string = '*'> {
  /** Tabla donde se buscarán las dependencias (la "target"). */
  targetTable: T;
  /** Columna FK de la tabla target que referencia al registro fuente. */
  targetColumn: C;
  /** Valor a comparar en targetColumn. */
  value: string;
  /** Columnas a devolver separadas por coma (legacy: `'*'` = todas). */
  select?: Select;
  /** Límite de filas para listar en el modal (el total se obtiene con count). */
  limit?: number;
  /** Ignorado (legacy): la query siempre corre en el servidor. */
  server?: boolean;
}

export type FetchDependenciesResult = {
  data: Record<string, unknown>[];
  count: number;
};

const COLUMN_RE = /^[a-z_][a-z0-9_]*$/i;

function assertTargetColumn(table: DependencyTargetTable, column: string): void {
  const allowed: readonly string[] = DEPENDENCY_TARGETS[table];
  if (!allowed.includes(column)) {
    throw new Error(`Columna de dependencia no admitida: ${table}.${column}`);
  }
}

function parseSelect(select: string): Record<string, true> | undefined {
  if (!select || select === '*') return undefined;
  const columns = select
    .split(',')
    .map((c) => c.trim())
    .filter((c) => COLUMN_RE.test(c));
  return columns.length > 0 ? Object.fromEntries(columns.map((c) => [c, true])) : undefined;
}

/** Registros de `targetTable` (de la empresa activa) cuya `targetColumn` vale `value`. */
export async function fetchDependenciesForValue<
  T extends DependencyTargetTable,
  C extends string,
  Select extends string = '*',
>(params: FetchDependenciesParams<T, C, Select>): Promise<FetchDependenciesResult> {
  const { targetTable, targetColumn, value, select = '*', limit = 10 } = params;
  assertTargetColumn(targetTable, targetColumn);
  const companyId = await getActiveCompanyId();
  const selectClause = parseSelect(select);

  try {
    if (targetTable === 'employees') {
      const where = withCompany({ [targetColumn]: value } as Prisma.employeesWhereInput, companyId);
      const [data, count] = await Promise.all([
        prisma.employees.findMany({
          where,
          take: limit,
          ...(selectClause ? { select: selectClause as Prisma.employeesSelect } : {}),
        }),
        prisma.employees.count({ where }),
      ]);
      return { data: data as Record<string, unknown>[], count };
    }

    const where = withCompany({ [targetColumn]: value } as Prisma.vehiclesWhereInput, companyId);
    const [data, count] = await Promise.all([
      prisma.vehicles.findMany({
        where,
        take: limit,
        ...(selectClause ? { select: selectClause as Prisma.vehiclesSelect } : {}),
      }),
      prisma.vehicles.count({ where }),
    ]);
    return { data: data as Record<string, unknown>[], count };
  } catch (error) {
    logger.error('Error al buscar dependencias', { data: { error, targetTable, targetColumn } });
    throw error;
  }
}

/**
 * Reapunta las filas que dependen de `fromValue` hacia `toValue` (o a NULL) antes de desactivar
 * un catálogo. Tabla y columna salen de la lista cerrada `DEPENDENCY_TARGETS` y la escritura va
 * acotada a la empresa activa: sin RLS, es la única defensa del endpoint.
 *
 * Devuelve la cantidad de filas reapuntadas.
 */
export async function reassignDependencies<T extends DependencyTargetTable>(params: {
  targetTable: T;
  targetColumn: string;
  fromValue: string;
  /** `null` deja la FK vacía (el modal lo envía como `__NULL__`). */
  toValue: string | null;
}): Promise<number> {
  const { targetTable, targetColumn, fromValue, toValue } = params;
  assertTargetColumn(targetTable, targetColumn);
  const companyId = await getActiveCompanyId();

  try {
    if (targetTable === 'employees') {
      const result = await prisma.employees.updateMany({
        where: withCompany({ [targetColumn]: fromValue } as Prisma.employeesWhereInput, companyId),
        data: { [targetColumn]: toValue } as Prisma.employeesUpdateManyMutationInput,
      });
      return result.count;
    }

    const result = await prisma.vehicles.updateMany({
      where: withCompany({ [targetColumn]: fromValue } as Prisma.vehiclesWhereInput, companyId),
      data: { [targetColumn]: toValue } as Prisma.vehiclesUpdateManyMutationInput,
    });
    return result.count;
  } catch (error) {
    logger.error('Error al reasignar dependencias', { data: { error, targetTable, targetColumn } });
    throw error;
  }
}

/** Opciones activas del catálogo fuente (empresa activa) para reemplazar al registro que se desactiva. */
export const fetchReplacementOptions = async (
  config: DependencyConfig,
  excludeId?: string
): Promise<{ id: string; name: string }[]> => {
  const table = config.sourceTable;
  if (!(table in REPLACEMENT_SOURCES)) {
    throw new Error(`Catálogo de reemplazo no admitido: ${table}`);
  }
  const companyId = await getActiveCompanyId();
  const where = withCompany({ is_active: true, ...(excludeId ? { id: { not: excludeId } } : {}) }, companyId);
  const args = { where, select: { id: true, name: true }, orderBy: { name: 'asc' as const } };

  const rows: Array<{ id: string; name: string | null }> = await (() => {
    switch (table as ReplacementSourceTable) {
      case 'company_positions':
        return prisma.company_positions.findMany(args);
      case 'work_diagram':
        return prisma.work_diagram.findMany(args);
      case 'types_of_contract':
        return prisma.types_of_contract.findMany(args);
      case 'equipment_owners':
        return prisma.equipment_owners.findMany(args);
      case 'sub_type':
        return prisma.sub_type.findMany(args);
      case 'type':
        return prisma.type.findMany(args);
    }
  })();

  return rows.map((row) => ({ id: String(row.id), name: String(row.name ?? '') }));
};
