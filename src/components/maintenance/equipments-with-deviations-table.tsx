'use client';

import { getEquipmentsWithPendingDeviations, getPendingDeviations } from '@/app/maintenance/actions';
import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
// import { BaseDataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import type { TypeOfRepair } from '@/types/types';
import type { ColumnDef } from '@tanstack/react-table';
import { Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CriticalDeviationsRepairModal } from './critical-deviations-repair-modal';

type EquipmentWithDeviations = {
  id: string;
  domain: string | null;
  serie: string | null;
  intern_number: string | null;
  type_name: string | null;
  deviation_count: number;
};

type Deviation = {
  id: string;
  item_code: string;
  item_label: string;
  section_code: string | null;
  created_at: string;
};

export function EquipmentsWithDeviationsTable() {
  const [equipments, setEquipments] = useState<EquipmentWithDeviations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [repairTypes, setRepairTypes] = useState<TypeOfRepair>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [equipmentsData, types] = await Promise.all([
          getEquipmentsWithPendingDeviations(),
          fetchAllTypesOfRepairs(),
        ]);
        setEquipments(equipmentsData as any);
        setRepairTypes(types as TypeOfRepair);
      } catch (error) {
        console.error('Error loading equipments with deviations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleResolveDeviations = async (equipmentId: string) => {
    try {
      const pendingDeviations = await getPendingDeviations(equipmentId);
      setDeviations(
        pendingDeviations.map((d: any) => ({
          id: d.id,
          item_code: d.item_code,
          item_label: d.item_label,
          section_code: d.section_code,
          created_at: d.created_at,
        }))
      );
      setSelectedEquipmentId(equipmentId);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading deviations:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEquipmentId(null);
    setDeviations([]);
    // Recargar la lista de equipos
    getEquipmentsWithPendingDeviations().then((data) => {
      setEquipments(data as any);
    });
  };

  const columns: ColumnDef<EquipmentWithDeviations>[] = [
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
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        return (
          <Button
            onClick={() => handleResolveDeviations(row.original.id)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Wrench className="h-4 w-4" />
            Resolver Desvíos
          </Button>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="p-4">Cargando equipos con desvíos...</div>;
  }

  if (equipments.length === 0) {
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
              options: [...new Set(equipments.map((e) => e.type_name).filter(Boolean))].map((type) => ({
                value: type!,
                label: type!,
              })),
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
