'use client';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useDailyReportDetailFormStore } from '../../../store/dailyReportDetailFormStore';
import {
  CustomerForForm,
  EmployeeForForm,
  OtherEquipmentItem,
  VehicleForForm,
  createDailyReportRowPrisma,
  getDailyReportRowForForm,
  updateDailyReportRowPrisma,
} from '../../actions.server';
import { CustomerServiceSection } from './CustomerServiceSection';
import { EmployeeSection } from './EmployeeSection';
import { EquipmentSection } from './EquipmentSection';
import { ScheduleSection } from './ScheduleSection';
import { DailyReportRowFormValues, dailyReportRowSchema } from './schema';

const logger = new Logger('DailyReportRowForm');

interface DailyReportRowFormProps {
  dailyReportId: string;
  reportDate?: string;
  customers: CustomerForForm[];
  employees: EmployeeForForm[];
  vehicles: VehicleForForm[];
  otherEquipment: OtherEquipmentItem[];
  onSuccess?: () => void;
}

const EMPTY_FORM_VALUES: DailyReportRowFormValues = {
  customer: '',
  services: '',
  item: '',
  employees: [],
  equipment: [],
  other_equipment: [],
  equipos_cliente: [],
  working_day: '',
  start_time: '',
  end_time: '',
  status: 'pendiente',
  description: '',
  document_path: '',
  sector_service_id: undefined,
  areas_service_id: undefined,
  remit_number: '',
  cancel_reason: '',
  reprogram_date: undefined,
  reasigment_reason: '',
  type_service: undefined,
  chofer_dia: undefined,
  chofer_noche: undefined,
  ayudante_dia: undefined,
  ayudante_noche: undefined,
  completed_day: false,
  completed_night: false,
};

export function DailyReportRowForm({
  dailyReportId,
  reportDate,
  customers,
  employees,
  vehicles,
  otherEquipment,
  onSuccess,
}: DailyReportRowFormProps) {
  const { isOpen, editingRowId, open, close } = useDailyReportDetailFormStore();
  const queryClient = useQueryClient();
  const [isLoadingRow, setIsLoadingRow] = useState(false);

  const isEditMode = editingRowId != null;

  const form = useForm<DailyReportRowFormValues>({
    resolver: zodResolver(dailyReportRowSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  // When editing, load the existing row and pre-populate the form
  useEffect(() => {
    if (!isOpen || !editingRowId) return;

    setIsLoadingRow(true);
    getDailyReportRowForForm(editingRowId)
      .then((row) => {
        if (!row) return;

        const workingDay = row.working_day?.toLowerCase() ?? '';
        const is12Hours = workingDay === 'jornada 12 horas';
        const is24Hours = workingDay === 'jornada 24 horas';
        const isRoleBased = is12Hours || is24Hours;

        // Build employees arrays from relations
        const employeeRels = row.dailyreportemployeerelations ?? [];
        type Role = 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche';
        const findRole = (role: Role) => employeeRels.find((e) => e.role === role)?.employee_id ?? undefined;

        const anyHasRole = employeeRels.some((e) =>
          ['chofer_dia', 'chofer_noche', 'ayudante_dia', 'ayudante_noche'].includes(e.role ?? '')
        );

        // Equipment ids
        const equipmentRels = row.dailyreportequipmentrelations ?? [];
        const vehicleIds = equipmentRels.filter((r) => r.equipment_id != null).map((r) => r.equipment_id!);
        const otherEqIds = equipmentRels.filter((r) => r.other_equipment_id != null).map((r) => r.other_equipment_id!);

        // Customer equipment ids
        const customerEqIds = (row.dailyreport_customer_equipment_relations ?? [])
          .map((r) => r.customer_equipment_id)
          .filter(Boolean) as string[];

        // Format times (HH:MM)
        const startTime = row.start_time ? moment(row.start_time).format('HH:mm') : '';
        const endTime = row.end_time ? moment(row.end_time).format('HH:mm') : '';

        form.reset({
          customer: row.customer_id ?? '',
          services: row.service_id ?? '',
          item: row.item_id ?? '',
          status: row.status ?? 'pendiente',
          working_day: row.working_day ?? '',
          start_time: startTime,
          end_time: endTime,
          description: row.description ?? '',
          document_path: row.document_path ?? '',
          sector_service_id: row.sector_service_id ?? undefined,
          areas_service_id: row.areas_service_id ?? undefined,
          remit_number: row.remit_number ?? '',
          cancel_reason: row.cancel_reason ?? '',
          type_service: (row.type_service as DailyReportRowFormValues['type_service']) ?? undefined,
          completed_day: row.completed_day ?? false,
          completed_night: row.completed_night ?? false,
          equipos_cliente: customerEqIds,
          equipment: vehicleIds,
          other_equipment: otherEqIds,
          // Employees with/without roles
          employees: isRoleBased && anyHasRole ? [] : employeeRels.map((e) => e.employee_id ?? '').filter(Boolean),
          chofer_dia: isRoleBased && anyHasRole ? findRole('chofer_dia') : undefined,
          chofer_noche: isRoleBased && anyHasRole ? findRole('chofer_noche') : undefined,
          ayudante_dia: isRoleBased && anyHasRole ? findRole('ayudante_dia') : undefined,
          ayudante_noche: isRoleBased && anyHasRole ? findRole('ayudante_noche') : undefined,
          reasigment_reason: '',
          reprogram_date: undefined,
        });
      })
      .catch((err) => {
        logger.error('Error al cargar la fila para editar', { data: { err } });
        toast.error('No se pudo cargar la fila para editar');
      })
      .finally(() => setIsLoadingRow(false));
  }, [isOpen, editingRowId, form]);

  const handleClose = () => {
    close();
    form.reset(EMPTY_FORM_VALUES);
  };

  const onSubmit = async (data: DailyReportRowFormValues) => {
    const workingDayLower = data.working_day?.toLowerCase() ?? '';
    const is12Hours = workingDayLower === 'jornada 12 horas';
    const is24Hours = workingDayLower === 'jornada 24 horas';
    const isRoleBased = is12Hours || is24Hours;

    type EmployeeRole = 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche';
    const employeesWithRoles: Array<{ id: string; role?: EmployeeRole }> = [];

    if (isRoleBased) {
      if (data.chofer_dia) employeesWithRoles.push({ id: data.chofer_dia, role: 'chofer_dia' });
      if (data.ayudante_dia) employeesWithRoles.push({ id: data.ayudante_dia, role: 'ayudante_dia' });
      if (data.chofer_noche) employeesWithRoles.push({ id: data.chofer_noche, role: 'chofer_noche' });
      if (data.ayudante_noche) employeesWithRoles.push({ id: data.ayudante_noche, role: 'ayudante_noche' });
    }

    const employeeIds = isRoleBased ? employeesWithRoles : (data.employees ?? []).map((id) => ({ id }));

    const rowInput = {
      customer_id: data.customer,
      service_id: data.services,
      item_id: data.item,
      status: data.completed_day && data.completed_night ? 'ejecutado' : data.status,
      working_day: data.working_day,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      description: data.description ?? null,
      sector_service_id: data.sector_service_id ?? null,
      areas_service_id: data.areas_service_id ?? null,
      remit_number: data.remit_number ?? null,
      cancel_reason: data.cancel_reason ?? null,
      completed_day: data.completed_day ?? null,
      completed_night: data.completed_night ?? null,
      type_service: data.type_service ?? null,
      employees: employeeIds,
      equipment: data.equipment ?? [],
      other_equipment: data.other_equipment ?? [],
      customer_equipment: data.equipos_cliente ?? [],
    };

    toast.promise(
      async () => {
        if (isEditMode && editingRowId) {
          await updateDailyReportRowPrisma(editingRowId, rowInput);
        } else {
          await createDailyReportRowPrisma({ ...rowInput, daily_report_id: dailyReportId });
        }

        await queryClient.invalidateQueries({ queryKey: ['daily-report-detail', dailyReportId] });
        handleClose();
        onSuccess?.();
      },
      {
        loading: isEditMode ? 'Actualizando fila del parte...' : 'Creando fila del parte...',
        success: isEditMode ? 'Fila del parte actualizada exitosamente' : 'Fila del parte creada exitosamente',
        error: isEditMode ? 'Error al actualizar la fila' : 'Error al crear la fila',
      }
    );
  };

  // Derive item info for sections
  const watchedCustomerId = form.watch('customer');
  const watchedServiceId = form.watch('services');
  const watchedItemId = form.watch('item');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === watchedCustomerId) ?? null,
    [customers, watchedCustomerId]
  );

  const selectedService = useMemo(
    () => selectedCustomer?.customer_services?.find((s) => s.id === watchedServiceId) ?? null,
    [selectedCustomer, watchedServiceId]
  );

  const selectedItem = useMemo(
    () => selectedService?.service_items?.find((i) => i.id === watchedItemId) ?? null,
    [selectedService, watchedItemId]
  );

  const itemNeedsPersonnel = selectedItem?.needs_personnel ?? true;
  const itemNeedsEquipment = selectedItem?.needs_equipment ?? true;
  const selectedItemName = selectedItem?.item_name ?? 'El ítem seleccionado';

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <SheetContent className="sm:max-w-screen-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Editar' : 'Agregar'} Fila del Parte Diario</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Actualice los campos necesarios para modificar la fila.'
              : 'Complete los campos para agregar una nueva fila al parte diario.'}
          </SheetDescription>
        </SheetHeader>

        {isEditMode && isLoadingRow ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando datos de la fila...</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CustomerServiceSection form={form} customers={customers} isEditMode={isEditMode} />

                {itemNeedsPersonnel && (
                  <EmployeeSection
                    form={form}
                    employees={employees}
                    selectedCustomerId={watchedCustomerId || null}
                    onOpenEmployeeSelector={() => {
                      // Task 7: EmployeeSelectorDialog — not yet created
                      logger.info('Employee selector dialog — pendiente de implementación');
                    }}
                  />
                )}

                {!itemNeedsPersonnel && (
                  <div className="text-sm text-muted-foreground italic px-1">
                    {selectedItemName} no requiere personal.
                  </div>
                )}

                <EquipmentSection
                  form={form}
                  vehicles={vehicles}
                  otherEquipment={otherEquipment}
                  selectedCustomerId={watchedCustomerId || null}
                  itemNeedsEquipment={itemNeedsEquipment}
                  selectedItemName={selectedItemName}
                  onOpenEquipmentSelector={() => {
                    // Task 8: EquipmentSelectorDialog — not yet created
                    logger.info('Equipment selector dialog — pendiente de implementación');
                  }}
                />

                <ScheduleSection form={form} isEditMode={isEditMode} reportDate={reportDate} />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}
