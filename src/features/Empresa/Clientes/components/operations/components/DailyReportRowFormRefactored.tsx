'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDailyReportFormStore } from '@/stores/useDailyReportFormStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import React from 'react';

// Importar secciones del formulario
import {
  CustomerDataSection,
  DateTimeSection,
  ObservationsSection,
  ResourcesSection,
  StatusSection,
} from './form-sections';

// Importar hooks personalizados
import { getCustomersClient } from '@/features/Operaciones/PartesDiarios/actions/actionsClient';
import { useCustomerData, useFormInitialization, useFormSchema, useFormSubmit } from './hooks';

export function DailyReportRowFormRefactored() {
  // Estado desde el store
  const { isOpen, selectedRow, isCreating, close, reset } = useDailyReportFormStore();

  // Fetch customers con useQuery
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomersClient,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // 1. Generar esquema de validación dinámico
  const schema = useFormSchema(isCreating);

  // 2. Valores por defecto (memoizados para evitar recreación)
  const defaultValues = React.useMemo(
    () => ({
      customer: '',
      services: '',
      item: '',
      date: undefined,
      start_time: '',
      end_time: '',
      working_day: '',
      employees: [],
      equipment: [],
      equipos_cliente: [],
      status: isCreating ? 'en_certificacion' : '',
      remit_number: '',
      observations: '',
      sector_service_id: '',
      areas_service_id: '',
    }),
    [isCreating]
  );

  // 3. Inicializar formulario
  const form = useFormInitialization({
    schema,
    defaultValues,
  });

  // 4. Hook de datos del cliente
  const {
    selectedCustomerId,
    selectedServiceId,
    selectedCustomer,
    customerServices,
    serviceItems,
    handleCustomerChange,
    handleServiceChange,
    isSectorDisabled,
    isAreaDisabled,
    setSelectedCustomerId,
    setSelectedServiceId,
    setSelectedCustomer,
    setIsSectorDisabled,
    setIsAreaDisabled,
  } = useCustomerData((customers || []) as any, form);

  // 5. Ref para rastrear si ya se inicializó
  const initializedRef = React.useRef(false);

  // 6. Inicializar formulario cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;

      if (!isCreating && selectedRow) {
        // Modo edición: cargar datos existentes
        const customerId = selectedRow.data_to_clone?.customer_id;
        const serviceId = selectedRow.data_to_clone?.service_id;

        // Extraer IDs de empleados y equipos de las referencias
        const employeeIds = selectedRow.employees_references?.map((emp: any) => emp.id) || [];
        const equipmentIds = selectedRow.equipment_references?.map((eq: any) => eq.id) || [];
        const customerEquipmentIds = selectedRow.customer_equipment?.map((eq: any) => eq.id) || [];

        // Buscar el cliente
        if (customerId && customers.length > 0) {
          const customer = customers.find((c: any) => c.id === customerId);
          if (customer) {
            setSelectedCustomer(customer);
            setSelectedCustomerId(customerId);
            if (serviceId) {
              setSelectedServiceId(serviceId);
            }

            // Habilitar sectores y áreas si existen
            const hasSectors = customer.customer_services?.some((s: any) => s.service_sectors?.length > 0);
            const hasAreas = customer.customer_services?.some((s: any) => s.service_areas?.length > 0);
            setIsSectorDisabled(!hasSectors);
            setIsAreaDisabled(!hasAreas);
          }
        }

        // Cargar datos en el formulario
        form.reset({
          customer: customerId || '',
          services: serviceId || '',
          item: selectedRow.data_to_clone?.item_id || '',
          date: selectedRow.date ? new Date(selectedRow.date) : undefined,
          start_time: selectedRow.start_time || '',
          end_time: selectedRow.end_time || '',
          working_day: selectedRow.working_day?.toLowerCase() || '',
          employees: employeeIds,
          equipment: equipmentIds,
          equipos_cliente: customerEquipmentIds,
          status: selectedRow.status || '',
          remit_number: selectedRow.remit_number || '',
          observations: selectedRow.description || '', // Cargar description en observations
          sector_service_id: selectedRow.data_to_clone?.sector_service_id || '',
          areas_service_id: selectedRow.data_to_clone?.areas_service_id || '',
          completed_day: selectedRow.completed_day || false,
          completed_night: selectedRow.completed_night || false,
        });
      } else if (isCreating) {
        // Modo creación: resetear a valores por defecto
        form.reset(defaultValues);
        setSelectedCustomer(null);
        setSelectedCustomerId(null);
        setSelectedServiceId(null);
      }
    }

    // Resetear el ref cuando se cierra el modal
    if (!isOpen) {
      initializedRef.current = false;
    }
  }, [
    isOpen,
    isCreating,
    selectedRow,
    customers,
    defaultValues,
    setSelectedCustomer,
    setSelectedCustomerId,
    setSelectedServiceId,
    setIsSectorDisabled,
    setIsAreaDisabled,
  ]);

  // 7. Lógica automática de cambio de estado según recursos
  React.useEffect(() => {
    if (!isCreating && isOpen) {
      const subscription = form.watch((value, { name }) => {
        // Solo actuar si cambian los recursos
        if (name === 'employees' || name === 'equipment') {
          const employees = value.employees || [];
          const equipment = value.equipment || [];
          const currentStatus = value.status;

          const hasResources = employees.length > 0 || equipment.length > 0;

          // Si está en "sin_recursos_asignados" y ahora tiene recursos -> cambiar a "pendiente"
          if (currentStatus === 'sin_recursos_asignados' && hasResources) {
            form.setValue('status', 'pendiente', { shouldValidate: true });
          }
          // Si está en "pendiente" y ya no tiene recursos -> cambiar a "sin_recursos_asignados"
          else if (currentStatus === 'pendiente' && !hasResources) {
            form.setValue('status', 'sin_recursos_asignados', { shouldValidate: true });
          }
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [form, isCreating, isOpen]);

  // 8. Query client para invalidar queries
  const queryClient = useQueryClient();

  // 9. Manejar envío
  const { onSubmit } = useFormSubmit(isCreating, selectedRow, () => {}, reset, queryClient);

  // 10. Obtener fecha del parte diario
  const formDate = form.watch('date');
  const reportDate = React.useMemo(() => {
    if (isCreating) {
      return formDate ? format(formDate, 'dd/MM/yyyy', { locale: es }) : null;
    } else {
      if (!selectedRow?.date) return null;

      // La fecha puede venir en formato "DD-MM-YYYY" o como Date
      try {
        // Intentar parsear si viene en formato "DD-MM-YYYY"
        if (typeof selectedRow.date === 'string' && selectedRow.date.includes('-')) {
          // Verificar si es formato DD-MM-YYYY
          const parts = selectedRow.date.split('-');
          if (parts.length === 3 && parts[0].length === 2) {
            const parsedDate = parse(selectedRow.date, 'dd-MM-yyyy', new Date());
            return format(parsedDate, 'dd/MM/yyyy', { locale: es });
          }
        }
        // Si es Date o formato ISO, usar directamente
        return format(new Date(selectedRow.date), 'dd/MM/yyyy', { locale: es });
      } catch (error) {
        // Si falla el parseo, mostrar la fecha tal como viene
        return selectedRow.date;
      }
    }
  }, [isCreating, selectedRow, formDate]);

  // 11. Manejar cancelación
  const handleCancel = () => {
    form.reset(defaultValues);
    setSelectedCustomer(null);
    setSelectedCustomerId(null);
    setSelectedServiceId(null);
    reset(); // Usar reset del store
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="sm:max-w-screen-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{isCreating ? 'Crear Línea de Parte Diario' : 'Editar Parte Diario'}</SheetTitle>
            {reportDate && (
              <Badge variant="outline" className="text-sm font-normal">
                Fecha: {reportDate}
              </Badge>
            )}
          </div>
          <SheetDescription>
            {isCreating
              ? 'Complete los campos para crear una nueva línea. Estado inicial: En certificación.'
              : 'Actualice los campos necesarios para modificar el parte diario.'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Sección 1: Datos del Cliente */}
              <CustomerDataSection
                form={form}
                customers={customers || []}
                isCreating={isCreating}
                selectedRow={selectedRow}
                selectedCustomerId={selectedCustomerId}
                selectedServiceId={selectedServiceId}
                selectedCustomer={selectedCustomer}
                customerServices={customerServices}
                serviceItems={serviceItems}
                isSectorDisabled={isSectorDisabled}
                isAreaDisabled={isAreaDisabled}
                handleCustomerChange={handleCustomerChange}
                handleServiceChange={handleServiceChange}
                disabled={isLoadingCustomers}
              />

              {/* Sección 2: Fecha y Horarios */}
              <DateTimeSection form={form} isCreating={isCreating} disabled={false} />

              {/* Sección 3: Recursos (Empleados y Equipos) */}
              <ResourcesSection form={form} isCreating={isCreating} selectedRow={selectedRow} disabled={false} />

              {/* Sección 4: Estado y Remito */}
              <StatusSection form={form} isCreating={isCreating} currentStatus={selectedRow?.status} disabled={false} />

              {/* Sección 5: Observaciones */}
              <ObservationsSection form={form} disabled={false} />

              {/* Footer con botones */}
              <SheetFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={form.formState.isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreating ? 'Crear' : 'Actualizar'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
