'use client';

import { Button } from '@/components/ui/button';
import { fetchAllTypesOfRepairs } from '@/features/Mantenimiento/TiposReparaciones/actions/actions';
import {
  getEquipmentsWithPendingDeviations,
  getPendingDeviations,
} from '@/features/Mantenimiento/actions/maintenance-actions';
import { CriticalDeviationsRepairModal } from '@/features/Mantenimiento/shared/components/critical-deviations-repair-modal';
import { Logger } from '@/lib/logger';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Wrench } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';

const logger = new Logger('EquipmentsWithDeviationsTableClient');

type EquipmentWithDeviations = {
  id: string | null;
  domain: string | null;
  serie: string | null;
  intern_number: string | null;
  type_name: string | null;
  deviation_count: number;
  last_deviation_date: string | null;
};

type Deviation = {
  id: string;
  item_code: string;
  item_label: string;
  section_code: string | null;
  created_at: string;
};

export const EQUIPMENTS_WITH_DEVIATIONS_QUERY_KEY = ['equipments-with-deviations'];

// Inferir tipos desde las server actions
type RepairTypesData = Awaited<ReturnType<typeof fetchAllTypesOfRepairs>>;

interface EquipmentsWithDeviationsTableClientProps {
  initialEquipments: EquipmentWithDeviations[];
  initialRepairTypes: RepairTypesData;
}

export function EquipmentsWithDeviationsTableClient({
  initialEquipments,
  initialRepairTypes,
}: EquipmentsWithDeviationsTableClientProps) {
  const queryClient = useQueryClient();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deviations, setDeviations] = useState<Deviation[]>([]);

  // useQuery con initialData para refetching/invalidacion
  const { data: equipments } = useQuery({
    queryKey: EQUIPMENTS_WITH_DEVIATIONS_QUERY_KEY,
    queryFn: () => getEquipmentsWithPendingDeviations(),
    initialData: initialEquipments,
  });

  // Query para tipos de reparación (ya se cargó en servidor)
  const { data: repairTypes } = useQuery({
    queryKey: ['types-of-repairs'],
    queryFn: fetchAllTypesOfRepairs,
    initialData: initialRepairTypes,
  });

  const handleResolveDeviations = async (equipmentId: string) => {
    try {
      const pendingDeviations = await getPendingDeviations(equipmentId);
      setDeviations(
        pendingDeviations.map((d) => ({
          id: d.id,
          item_code: d.item_code,
          item_label: d.item_label,
          section_code: d.section_code,
          created_at: d.created_at || new Date().toISOString(),
        }))
      );
      setSelectedEquipmentId(equipmentId);
      setShowModal(true);
    } catch (error) {
      logger.error('Error loading deviations', { data: { error } });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEquipmentId(null);
    setDeviations([]);
    // Invalidar query para refrescar la lista
    queryClient.invalidateQueries({ queryKey: EQUIPMENTS_WITH_DEVIATIONS_QUERY_KEY });
  };

  const columns: ColumnDef<EquipmentWithDeviations>[] = useMemo(
    () => [
      {
        accessorKey: 'domain',
        header: 'Dominio',
        cell: ({ row }) => {
          const domain = row.original.domain;
          const serie = row.original.serie;
          const internNumber = row.original.intern_number;
          return (
            <div>
              {domain || serie || 'Sin dominio/serie'}
              {internNumber && <span className="text-muted-foreground ml-1">(Nº {internNumber})</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'type_name',
        header: 'Tipo',
        cell: ({ row }) => row.original.type_name || 'N/A',
      },
      {
        accessorKey: 'deviation_count',
        header: 'Cantidad de Desvíos',
        cell: ({ row }) => {
          const count = row.original.deviation_count;
          return (
            <span className="font-semibold text-destructive">
              {count} {count === 1 ? 'desvío' : 'desvíos'}
            </span>
          );
        },
      },
      {
        accessorKey: 'last_deviation_date',
        header: 'Último Desvío',
        cell: ({ row }) => {
          const date = row.original.last_deviation_date;
          if (!date) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex flex-col">
              <span>{moment(date).format('DD/MM/YYYY')}</span>
              <span className="text-xs text-muted-foreground">{moment(date).format('HH:mm')}</span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const equipmentId = row.original.id;
          if (!equipmentId) return null;
          return (
            <Button onClick={() => handleResolveDeviations(equipmentId)} variant="outline" size="sm" className="gap-2">
              <Wrench className="h-4 w-4" />
              Resolver Desvíos
            </Button>
          );
        },
      },
    ],
    []
  );

  // Opciones de filtro para tipos
  const typeOptions = useMemo(() => {
    if (!equipments) return [];
    return [...new Set(equipments.map((e) => e.type_name).filter(Boolean))].map((type) => ({
      value: type!,
      label: type!,
    }));
  }, [equipments]);

  if (!equipments || equipments.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No hay equipos con desvíos pendientes.</div>;
  }

  return (
    <>
      <BaseDataTable
        savedVisibility={{}}
        columns={columns}
        data={equipments}
        toolbarOptions={{
          initialVisibleFilters: [],
          searchableColumns: [
            { columnId: 'domain', placeholder: 'Buscar por dominio...' },
            { columnId: 'serie', placeholder: 'Buscar por serie...' },
          ],
          filterableColumns: [
            {
              columnId: 'type_name',
              title: 'Tipo',
              options: typeOptions,
            },
          ],
          showViewOptions: true,
        }}
        tableId="equipments-with-deviations-table"
      />

      {showModal && selectedEquipmentId && (
        <CriticalDeviationsRepairModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onComplete={handleCloseModal}
          deviations={deviations}
          equipmentId={selectedEquipmentId}
        />
      )}
    </>
  );
}
