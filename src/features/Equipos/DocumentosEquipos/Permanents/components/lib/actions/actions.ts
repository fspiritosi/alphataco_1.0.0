'use server';

import { queryWithPagination, type Filter } from '@/app/server/GET/probando';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

// 🔑 INTERFAZ ESTÁNDAR para documentos permanentes de equipos
interface FetchPermanentEquipmentDocumentsOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_equipment'>[];
}

// ✅ PATRÓN CORRECTO: Documentos permanentes de equipos con queryWithPagination
export async function fetchPermanentEquipmentDocumentsData(options: FetchPermanentEquipmentDocumentsOptions) {
  const data = await queryWithPagination(
    'documents_equipment', // 🔑 Tabla principal
    `*,documents_equipment_logs(updated_at),document_types!inner(*),vehicles(*,contractor_equipment(*, customers(*)))`,
    {
      ...options,
      sorting: [...options.sorting, { id: 'created_at', desc: true }],
      permanent_filter: (query) => {
        return query
          .eq('document_types.is_it_montlhy', false)
          .eq('document_types.is_active', true)
          .eq('vehicles.is_active', true)
          .not('vehicles', 'is', null)
          .not('document_types', 'is', null);
      },
      filters: options.filters || [],
      server: true,
    }
  );

  return data;
}

// ✅ PATRÓN CORRECTO: Exportación completa para documentos permanentes de equipos
export async function fetchAllPermanentEquipmentDocumentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'documents_equipment',
    `*,documents_equipment_logs(updated_at),document_types!inner(*),vehicles(*,contractor_equipment(*, customers(*)))`,
    {
      pageIndex: 0,
      pageSize: 10000, // 🔑 Tamaño grande para exportación
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: options.server,
      // 🔑 PERMANENT_FILTER: Left joins + not null + filtros permanentes
      permanent_filter: (query) => {
        return (
          query
            // Filtros para documentos permanentes
            .eq('document_types.is_it_montlhy', false)
            .eq('document_types.applies', 'Equipos')
            .eq('document_types.is_active', true)
            // Filtros not null (reemplazando inner joins)
            .not('vehicles', 'is', null)
            .not('document_types', 'is', null)
        );
      },
    }
  );

  return { rows: data.rows }; // Mantener estructura para compatibilidad
}

// 🔑 IMPORTANTE: Función auxiliar para obtener tipos de documentos permanentes de equipos
export async function getPermanentEquipmentDocumentTypes() {
  // Esta función puede ser útil para configurar los filtros dinámicamente
  return [];
}
