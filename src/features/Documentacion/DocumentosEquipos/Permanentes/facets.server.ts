'use server';

import { Logger } from '@/lib/logger';
import { NULL_FILTER_VALUE, parseSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { buildBaseWhereClause, buildWhereClause } from './lib/where';

const logger = new Logger('DocumentosEquiposPermanentes/facets');

// ============================================================================
// FACETS — Single facet (lazy-load on-demand)
// ============================================================================

/**
 * Retorna counts + opciones resueltas para UNA sola columna (lazy-load).
 * Implementa crossWhere: aplica todos los filtros EXCEPTO el de la columna solicitada.
 */
export async function getEquipmentPermanentDocumentsSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams,
  equipmentId?: string
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getActiveCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  async function crossWhere(excludeColumn: string) {
    if (!parsedState) {
      return buildBaseWhereClause(companyId, equipmentId);
    }
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified, equipmentId);
  }

  function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      if (key == null) {
        map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        map.set(String(key), count);
      }
    }
    return map;
  }

  try {
    switch (columnId) {
      case 'state': {
        const where = await crossWhere('state');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['state'],
          where,
          _count: { state: true },
        });
        return {
          counts: toFacetMap(rows.map((r) => ({ key: r.state as string | null, count: r._count.state }))),
        };
      }

      case 'document_type': {
        const where = await crossWhere('document_type');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where,
          _count: { id_document_types: true },
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.id_document_types, count: r._count.id_document_types })));
        const ids = rows.map((r) => r.id_document_types).filter((id): id is string => id != null);
        const options =
          ids.length > 0
            ? await prisma.document_types.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions: options };
      }

      case 'mandatory': {
        const where = await crossWhere('mandatory');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where,
          _count: { id_document_types: true },
        });
        const dtIds = rows.map((r) => r.id_document_types).filter((id): id is string => id != null);
        const dtRecords =
          dtIds.length > 0
            ? await prisma.document_types.findMany({
                where: { id: { in: dtIds } },
                select: { id: true, mandatory: true },
              })
            : [];
        const boolDtMap = new Map(dtRecords.map((dt) => [dt.id, dt]));
        const countMap = new Map<string, number>();
        for (const row of rows) {
          const count = row._count.id_document_types;
          if (row.id_document_types == null) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + count);
          } else {
            const dt = boolDtMap.get(row.id_document_types);
            const val = dt?.mandatory;
            const key = val == null ? NULL_FILTER_VALUE : String(val);
            countMap.set(key, (countMap.get(key) ?? 0) + count);
          }
        }
        return { counts: countMap };
      }

      case 'multiresource': {
        const where = await crossWhere('multiresource');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where,
          _count: { id_document_types: true },
        });
        const dtIds = rows.map((r) => r.id_document_types).filter((id): id is string => id != null);
        const dtRecords =
          dtIds.length > 0
            ? await prisma.document_types.findMany({
                where: { id: { in: dtIds } },
                select: { id: true, multiresource: true },
              })
            : [];
        const boolDtMap = new Map(dtRecords.map((dt) => [dt.id, dt]));
        const countMap = new Map<string, number>();
        for (const row of rows) {
          const count = row._count.id_document_types;
          if (row.id_document_types == null) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + count);
          } else {
            const dt = boolDtMap.get(row.id_document_types);
            const val = dt?.multiresource;
            const key = val == null ? NULL_FILTER_VALUE : String(val);
            countMap.set(key, (countMap.get(key) ?? 0) + count);
          }
        }
        return { counts: countMap };
      }

      case 'contractor': {
        const where = await crossWhere('contractor');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                contractor_equipment: {
                  select: { customers: { select: { id: true, name: true } } },
                },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const contractors = row.vehicles?.contractor_equipment ?? [];
          if (contractors.length === 0) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            for (const ce of contractors) {
              if (ce.customers?.id) {
                countMap.set(ce.customers.id, (countMap.get(ce.customers.id) ?? 0) + 1);
                optionsMap.set(ce.customers.id, ce.customers.name);
              }
            }
          }
        }
        const resolvedOptions = Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name }));
        return { counts: countMap, resolvedOptions };
      }

      case 'vehicle_type': {
        const where = await crossWhere('vehicle_type');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                type: true,
                type_vehicles_typeTotype: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const typeId = row.vehicles?.type;
          const typeName = row.vehicles?.type_vehicles_typeTotype?.name ?? null;
          if (!typeId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(typeId, (countMap.get(typeId) ?? 0) + 1);
            if (typeName) optionsMap.set(typeId, typeName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_subtype': {
        const where = await crossWhere('vehicle_subtype');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                subType: true,
                sub_type: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const subTypeId = row.vehicles?.subType;
          const subTypeName = row.vehicles?.sub_type?.name ?? null;
          if (!subTypeId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(subTypeId, (countMap.get(subTypeId) ?? 0) + 1);
            if (subTypeName) optionsMap.set(subTypeId, subTypeName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_brand': {
        const where = await crossWhere('vehicle_brand');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                brand: true,
                brand_vehicles: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const brandId = row.vehicles?.brand;
          const brandName = row.vehicles?.brand_vehicles?.name ?? null;
          if (brandId == null) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            // brand es Int, usar String para la key del Map
            const key = String(brandId);
            countMap.set(key, (countMap.get(key) ?? 0) + 1);
            if (brandName) optionsMap.set(key, brandName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_owner': {
        const where = await crossWhere('vehicle_owner');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                owner_id: true,
                equipment_owners: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const ownerId = row.vehicles?.owner_id;
          const ownerName = row.vehicles?.equipment_owners?.name ?? null;
          if (!ownerId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(ownerId, (countMap.get(ownerId) ?? 0) + 1);
            if (ownerName) optionsMap.set(ownerId, ownerName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_sector': {
        const where = await crossWhere('vehicle_sector');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                sector: true,
                hierarchy: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const sectorId = row.vehicles?.sector;
          const sectorName = row.vehicles?.hierarchy?.name ?? null;
          if (!sectorId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(sectorId, (countMap.get(sectorId) ?? 0) + 1);
            if (sectorName) optionsMap.set(sectorId, sectorName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_contract_type': {
        const where = await crossWhere('vehicle_contract_type');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: { type_of_contract: true },
            },
          },
        });
        const countMap = new Map<string, number>();
        for (const row of rowsData) {
          const val = row.vehicles?.type_of_contract;
          const key = val == null ? NULL_FILTER_VALUE : String(val);
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
        return { counts: countMap };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de documentos permanentes de equipos', {
      data: { error, columnId },
    });
    return null;
  }
}
