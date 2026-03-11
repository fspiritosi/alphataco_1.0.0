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

        // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
        const pivotRepairTypes = (item as any).maintenance_order_item_repair_types || [];
        const repairTypeIds: string[] =
          pivotRepairTypes.length > 0
            ? pivotRepairTypes.map((rt: any) => rt.repair_type_id).filter(Boolean)
            : repairType?.id
              ? [repairType.id]
              : [];
        const repairTypeNames: string[] =
          pivotRepairTypes.length > 0
            ? pivotRepairTypes.map((rt: any) => rt.types_of_repairs?.name).filter(Boolean)
            : repairType?.name
              ? [repairType.name]
              : [];

        // Extraer información de la orden de trabajo asociada
        const workOrder = (item as any).work_orders;

        desvios.push({
          id: item.id,
          orderId: order.id,
          // Info del equipo
          vehicleId: vehicle?.id || '',
          vehicleDomain: vehicle?.domain || null,
          vehicleSerie: vehicle?.serie || null,
          vehicleInternNumber: vehicle?.intern_number || null,
          vehicleType: vehicle?.type_vehicles_typeTotype?.name || null,
          vehicleCondition: vehicle?.condition || null,
          // Info del desvío
          deviationId: deviation?.id || null,
          itemLabel: deviation?.item_label || 'Sin descripción',
          itemCode: deviation?.item_code || null,
          sectionCode: deviation?.section_code || null,
          description: item.maintenance_request_items?.description || null,
          driverComment: (item.maintenance_request_items as any)?.driver_comment || deviation?.driver_comment || null,
          // Tipo de reparación (legacy)
          repairTypeId: repairType?.id || null,
          repairTypeName: repairType?.name || null,
          // Múltiples tipos de reparación (pivot)
          repairTypeIds,
          repairTypeNames,
          // Info de la orden
          workshopEntryDate: order.workshop_entry_date?.toISOString() ?? null,
          kilometer: order.maintenance_requests?.kilometer || null,
          // Asignaciones
          workshopId: (item as any).assigned_workshop_id || null,
          sectorId: (item as any).assigned_sector_id || null,
          startDate: (item as any).planned_start_date || null,
          endDate: (item as any).planned_end_date || null,
          // Orden de trabajo asociada
          workOrderId: workOrder?.id || (item as any).work_order_id || null,
          workOrderNumber: workOrder?.order_number || null,
          workOrderStatus: workOrder?.status || null,
          workOrderPriority: workOrder?.priority || null,
          workOrderWorkshopId: workOrder?.workshop_id || null,
          workOrderWorkshopName: workOrder?.workshops?.name || null,
          workOrderSectorId: workOrder?.sector_id || null,
          workOrderSectorName: workOrder?.workshop_sectors?.name || null,
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

  // Generar opciones de tipos de reparación (considera pivot y legacy)
  const repairTypeOptions = useMemo(() => {
    const uniqueTypes = new Map<string, { label: string; value: string }>();
    desviosData.forEach((desvio) => {
      // Usar repairTypeNames (pivot) primero, si está vacío usar repairTypeName (legacy)
      const repairTypes =
        desvio.repairTypeNames?.length > 0
          ? desvio.repairTypeNames
          : desvio.repairTypeName
            ? [desvio.repairTypeName]
            : [];
      repairTypes.forEach((typeName) => {
        if (typeName && !uniqueTypes.has(typeName)) {
          uniqueTypes.set(typeName, { label: typeName, value: typeName });
        }
      });
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
            {
              columnId: 'Estado',
              title: 'Estado',
              options: [
                { label: 'Pendiente', value: 'Pendiente' },
                { label: 'Asignado', value: 'Asignado' },
                { label: 'Con OT', value: 'Con OT' },
              ],
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
