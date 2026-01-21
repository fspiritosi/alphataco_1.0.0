'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getMaintenanceOrdersInWorkshop, type MaintenanceOrdersInWorkshopData } from '../../actions/actionsServer';
import { PLANIFICACION_QUERY_KEY } from '../hooks/usePlanificacion';
import { AsignarBulkDialog } from './AsignarBulkDialog';
import { AsignarTallerDialog } from './AsignarTallerDialog';
import { getColumns, type DesvioRowData } from './columns';

interface PlanificacionTableClientProps {
  initialData: MaintenanceOrdersInWorkshopData;
  workshops?: Array<{ id: string; name: string; workshop_type: string }>;
  sectors?: Array<{ id: string; name: string; workshop_id: string }>;
}

export function PlanificacionTableClient({ initialData, workshops = [], sectors = [] }: PlanificacionTableClientProps) {
  const [selectedDesvio, setSelectedDesvio] = useState<DesvioRowData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedDesvios, setSelectedDesvios] = useState<DesvioRowData[]>([]);

  // useQuery con initialData para refetching/invalidacion
  const { data: orders } = useQuery({
    queryKey: PLANIFICACION_QUERY_KEY,
    queryFn: () => getMaintenanceOrdersInWorkshop(),
    initialData,
  });

  // Transformar los datos: aplanar desvíos para que cada fila sea un desvío
  const desviosData: DesvioRowData[] = useMemo(() => {
    if (!orders) return [];

    const desvios: DesvioRowData[] = [];

    orders.forEach((order) => {
      const vehicle = order.vehicles;
      const items = order.maintenance_order_items || [];

      items.forEach((item) => {
        const deviation = item.maintenance_request_items?.checklist_deviations;
        const repairType = item.types_of_repairs;

        desvios.push({
          id: item.id,
          orderId: order.id,
          // Info del equipo
          vehicleId: vehicle?.id || '',
          vehicleDomain: vehicle?.domain || null,
          vehicleSerie: vehicle?.serie || null,
          vehicleInternNumber: vehicle?.intern_number || null,
          vehicleType: vehicle?.vehicle_type?.name || null,
          vehicleCondition: vehicle?.condition || null,
          // Info del desvío
          deviationId: deviation?.id || null,
          itemLabel: deviation?.item_label || 'Sin descripción',
          itemCode: deviation?.item_code || null,
          sectionCode: deviation?.section_code || null,
          // Tipo de reparación
          repairTypeId: repairType?.id || null,
          repairTypeName: repairType?.name || null,
          // Info de la orden
          workshopEntryDate: order.workshop_entry_date,
          kilometer: order.maintenance_requests?.kilometer || null,
          // Asignaciones (TODO: agregar campos reales cuando existan en DB)
          workshopId: (item as typeof item & { workshop_id?: string }).workshop_id || null,
          sectorId: (item as typeof item & { sector_id?: string }).sector_id || null,
          startDate: (item as typeof item & { start_date?: string }).start_date || null,
          endDate: (item as typeof item & { end_date?: string }).end_date || null,
        });
      });
    });

    return desvios;
  }, [orders]);

  // Generar opciones de equipos dinámicamente desde los datos
  const equipmentOptions = useMemo(() => {
    const uniqueEquipments = new Map<string, { label: string; value: string }>();
    desviosData.forEach((desvio) => {
      const label = desvio.vehicleDomain || desvio.vehicleSerie || 'Sin identificar';
      const displayLabel = desvio.vehicleInternNumber ? `${label} (#${desvio.vehicleInternNumber})` : label;
      if (!uniqueEquipments.has(label)) {
        uniqueEquipments.set(label, { label: displayLabel, value: label });
      }
    });
    return Array.from(uniqueEquipments.values());
  }, [desviosData]);

  // Generar opciones de secciones dinámicamente
  const sectionOptions = useMemo(() => {
    const uniqueSections = new Map<string, { label: string; value: string }>();
    desviosData.forEach((desvio) => {
      if (desvio.sectionCode) {
        const formattedSection = desvio.sectionCode
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (!uniqueSections.has(desvio.sectionCode)) {
          uniqueSections.set(desvio.sectionCode, { label: formattedSection, value: desvio.sectionCode });
        }
      }
    });
    return Array.from(uniqueSections.values());
  }, [desviosData]);

  // Generar opciones de tipos de reparación
  const repairTypeOptions = useMemo(() => {
    const uniqueTypes = new Map<string, { label: string; value: string }>();
    desviosData.forEach((desvio) => {
      if (desvio.repairTypeName) {
        if (!uniqueTypes.has(desvio.repairTypeName)) {
          uniqueTypes.set(desvio.repairTypeName, { label: desvio.repairTypeName, value: desvio.repairTypeName });
        }
      }
    });
    return Array.from(uniqueTypes.values());
  }, [desviosData]);

  const handleAssign = (desvio: DesvioRowData) => {
    setSelectedDesvio(desvio);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedDesvio(null);
    setDialogOpen(false);
  };

  const handleBulkAssign = () => {
    setBulkDialogOpen(true);
  };

  const handleCloseBulkDialog = () => {
    setBulkDialogOpen(false);
  };

  const handleBulkSuccess = () => {
    setSelectedDesvios([]); // Limpiar selección después de asignación exitosa
  };

  const handleRowSelectionChange = (rows: DesvioRowData[]) => {
    setSelectedDesvios(rows);
  };

  const columns = useMemo(
    () =>
      getColumns({
        onAssign: handleAssign,
      }),
    []
  );

  return (
    <>
      {/* Barra de acciones cuando hay selección */}
      {selectedDesvios.length > 0 && (
        <div className="flex items-center justify-between p-3 mb-4 bg-muted/50 border rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedDesvios.length} desvío{selectedDesvios.length !== 1 ? 's' : ''} seleccionado
            {selectedDesvios.length !== 1 ? 's' : ''}
          </span>
          <PermissionGuard module="mantenimiento" tab="planificacion" action="update">
            <Button onClick={handleBulkAssign} size="sm">
              <Settings2 className="mr-2 h-4 w-4" />
              Asignar Taller y Período
            </Button>
          </PermissionGuard>
        </div>
      )}

      <BaseDataTable
        columns={columns}
        data={desviosData}
        tableId="planificacion-desvios-table"
        savedVisibility={{}}
        enableRowSelection={true}
        onRowSelectionChange={handleRowSelectionChange}
        toolbarOptions={{
          initialVisibleFilters: ['Equipo', 'Seccion'],
          filterableColumns: [
            {
              columnId: 'Equipo',
              title: 'Equipo',
              options: equipmentOptions,
            },
            {
              columnId: 'Seccion',
              title: 'Sección',
              options: sectionOptions,
            },
            {
              columnId: 'TipoReparacion',
              title: 'Tipo Reparación',
              options: repairTypeOptions,
            },
          ],
          showViewOptions: true,
        }}
      />

      {selectedDesvio && (
        <AsignarTallerDialog
          desvio={selectedDesvio}
          open={dialogOpen}
          onClose={handleCloseDialog}
          workshops={workshops}
          sectors={sectors}
        />
      )}

      {selectedDesvios.length > 0 && (
        <AsignarBulkDialog
          desvios={selectedDesvios}
          open={bulkDialogOpen}
          onClose={handleCloseBulkDialog}
          workshops={workshops}
          sectors={sectors}
          onSuccess={handleBulkSuccess}
        />
      )}
    </>
  );
}
