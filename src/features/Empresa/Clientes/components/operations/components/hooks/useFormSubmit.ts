import {
  checkDailyReportExistsClient,
  createDailyReportClient,
  createDailyReportCustomerEquipmentRelationsClient,
  createDailyReportEmployeeRelationsClient,
  createDailyReportEquipmentRelationsClient,
  createDailyReportRowClient,
  syncDailyReportCustomerEquipmentRelationsClient,
  syncDailyReportEmployeeRelationsClient,
  syncDailyReportEquipmentRelationsClient,
  updateDailyReportStatusAndRemitNumberClient,
} from '@/features/Operaciones/PartesDiarios/actions/actionsClient';
import { createRemitoClient } from '@/features/Operaciones/PartesDiarios/remitManager/actions/actionsClient';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

type FormData = {
  date?: Date;
  customer: string;
  services: string;
  item: string;
  working_day: string;
  employees?: string[];
  equipment?: string[];
  equipos_cliente?: string[];
  start_time?: string;
  end_time?: string;
  status?: string;
  remit_number?: string;
  description?: string;
  observations?: string; // Campo del formulario
  sector_service_id?: string;
  areas_service_id?: string;
};

export function useFormSubmit(
  isCreating: boolean,
  selectedRow: any,
  refetchDailyReport: () => void,
  onClose: () => void,
  queryClient: any
) {
  const router = useRouter();

  const handleCreate = useCallback(
    async (data: FormData) => {
      if (!data.date) {
        toast.error('Debe seleccionar una fecha.');
        return;
      }

      if (!data.remit_number) {
        toast.error('El número de remito es obligatorio.');
        return;
      }

      const formattedDate = format(data.date, 'yyyy-MM-dd');

      // 1. Verificar si existe daily_report para esa fecha
      const existingReports = await checkDailyReportExistsClient([formattedDate]);
      let dailyReportId: string;

      if (existingReports && existingReports.length > 0) {
        dailyReportId = existingReports[0].id;
      } else {
        // 2. Crear daily_report si no existe
        const createdReports = await createDailyReportClient([formattedDate]);
        if (!createdReports || createdReports.length === 0) {
          toast.error('Error al crear el parte diario.');
          return;
        }
        dailyReportId = createdReports[0].id;
      }

      // 3. Crear daily_report_row (SIN remit_number)
      // Determinar completed_day y completed_night según la jornada
      const is24Hours = data.working_day === 'jornada 24 horas';

      const rowData = {
        daily_report_id: dailyReportId,
        customer_id: data.customer, // ✅ Corregido: customer_id
        service_id: data.services, // ✅ Corregido: service_id
        item_id: data.item, // ✅ Corregido: item_id
        working_day: data.working_day,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        status: 'en_certificacion',
        // ❌ NO guardar remit_number aquí
        description: data.observations || null, // Usar 'observations' que es el campo del formulario
        sector_service_id: data.sector_service_id || null,
        areas_service_id: data.areas_service_id || null,
        completed_day: is24Hours ? true : null,
        completed_night: is24Hours ? true : null,
      };

      const createdRows = await createDailyReportRowClient([rowData as any]);
      if (!createdRows || createdRows.length === 0) {
        toast.error('Error al crear la línea del parte diario.');
        return;
      }

      const newRowId = createdRows[0].id;

      // 3.5. Crear remito en la tabla remitos (NUEVO)
      if (data.remit_number) {
        try {
          await createRemitoClient(newRowId, data.remit_number);
        } catch (error) {
          console.error('Error al crear remito:', error);
          toast.error('Error al crear el remito. La línea se creó pero sin remito.');
        }
      }

      // 4. Crear relaciones de empleados
      if (data.employees && data.employees.length > 0) {
        await createDailyReportEmployeeRelationsClient(newRowId, data.employees);
      }

      // 5. Crear relaciones de equipos
      if (data.equipment && data.equipment.length > 0) {
        await createDailyReportEquipmentRelationsClient(newRowId, data.equipment);
      }

      // 6. Crear relaciones de equipos de cliente
      if (data.equipos_cliente && data.equipos_cliente.length > 0) {
        await createDailyReportCustomerEquipmentRelationsClient(newRowId, data.equipos_cliente);
      }

      toast.success('Línea creada exitosamente.');
      // Primero invalidar para marcar como stale
      queryClient.invalidateQueries({
        queryKey: [`filtered-daily-report-rows`],
      });
      // Luego forzar refetch
      await queryClient.refetchQueries({
        queryKey: [`filtered-daily-report-rows`],
        type: 'active',
      });
      // }
      onClose();

      // Refetch de los datos de la tabla
      await refetchDailyReport();

      router.refresh();
    },
    [refetchDailyReport, onClose, router, queryClient]
  );

  const handleUpdate = useCallback(
    async (data: FormData) => {
      const currentStatusInRow = selectedRow?.status;
      const isChangingToCertificacion = data.status === 'en_certificacion';

      if (isChangingToCertificacion) {
        if (!data.remit_number) {
          toast.error('El número de remito es obligatorio para el estado "En certificación".');
          return;
        }
        if (currentStatusInRow !== 'ejecutado') {
          toast.error('El estado solo puede cambiar a "en_certificacion" si el parte ya está en estado "ejecutado".');
          return;
        }
      }
      // Determinar el estado final basado en los recursos
      const hasEmployees = data.employees && data.employees.length > 0;
      const hasEquipment = data.equipment && data.equipment.length > 0;
      const hasResources = hasEmployees || hasEquipment;

      let finalStatus = data.status;

      // Lógica automática de cambio de estado
      if (!hasResources && (data.status === 'pendiente' || data.status === 'sin_recursos_asignados')) {
        finalStatus = 'sin_recursos_asignados';
      } else if (hasResources && data.status === 'sin_recursos_asignados') {
        finalStatus = 'pendiente';
      }

      const updateData = {
        status: finalStatus,
        description: data.observations || null, // Usar 'observations' que es el campo del formulario
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        working_day: data.working_day || null,
        sector_service_id: data.sector_service_id || null,
        areas_service_id: data.areas_service_id || null,
        last_comercial_edit_at: new Date().toISOString(),
      };
      await updateDailyReportStatusAndRemitNumberClient(selectedRow.id, updateData as any);

      // Crear remito en la tabla remitos si se está cambiando a certificación (NUEVO)
      if (isChangingToCertificacion && data.remit_number) {
        try {
          await createRemitoClient(selectedRow.id, data.remit_number);
        } catch (error) {
          console.error('Error al crear remito:', error);
          // Si el remito ya existe, no es un error crítico
          if (error instanceof Error && error.message.includes('Ya existe')) {
            toast.warning('El remito ya existe para esta línea.');
          } else {
            toast.error('Error al crear el remito.');
          }
        }
      }

      // Sincronizar relaciones de empleados
      if (data.employees !== undefined) {
        await syncDailyReportEmployeeRelationsClient(selectedRow.id, data.employees || []);
      }

      // Sincronizar relaciones de equipos
      if (data.equipment !== undefined) {
        await syncDailyReportEquipmentRelationsClient(selectedRow.id, data.equipment || []);
      }

      // Sincronizar relaciones de equipos de cliente
      if (data.equipos_cliente !== undefined) {
        await syncDailyReportCustomerEquipmentRelationsClient(selectedRow.id, data.equipos_cliente || []);
      }

      toast.success('Parte diario actualizado exitosamente.');

      // Invalidar y refetch inmediato de las queries para actualizar la tabla
      // const dailyReportId = selectedRow?.daily_report_id;

      // // if (dailyReportId) {
      // // Primero invalidar para marcar como stale
      queryClient.invalidateQueries({
        queryKey: [`filtered-daily-report-rows`],
      });
      // // Luego forzar refetch
      // await queryClient.refetchQueries({
      //     queryKey: [`filtered-daily-report-rows`],
      //     type: 'active',
      // });
      // // }

      onClose();
      // refetchDailyReport();
      // router.refresh();
    },
    [selectedRow, refetchDailyReport, onClose, router, queryClient]
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        if (isCreating) {
          await handleCreate(data);
        } else {
          await handleUpdate(data);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error(isCreating ? 'Error al crear la línea.' : 'Error al actualizar el parte diario.');
      }
    },
    [isCreating, handleCreate, handleUpdate]
  );

  return { onSubmit };
}
