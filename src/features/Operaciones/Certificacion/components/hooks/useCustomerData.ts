import type { GetCustomersClientType } from '@/features/Operaciones/PartesDiarios/actions/actionsClient';
import { useCallback, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

export function useCustomerData(customers: GetCustomersClientType[], form: UseFormReturn<any>) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<GetCustomersClientType | null>(null);
  const [isSectorDisabled, setIsSectorDisabled] = useState<boolean>(true);
  const [isAreaDisabled, setIsAreaDisabled] = useState<boolean>(true);

  // Servicios del cliente seleccionado
  const customerServices = useMemo(() => {
    if (!selectedCustomer?.customer_services?.length) return [];

    return selectedCustomer.customer_services.filter(
      (service) => service.is_active && (!service.service_validity || new Date(service.service_validity) >= new Date())
    );
  }, [selectedCustomer]);

  // Ítems del servicio seleccionado
  const serviceItems = useMemo(() => {
    if (!selectedServiceId || !selectedCustomer?.customer_services?.length) return [];

    const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

    return selectedService?.service_items?.filter((item: any) => item.is_active) || [];
  }, [selectedCustomer, selectedServiceId]);

  // Manejar cambio de cliente
  const handleCustomerChange = useCallback(
    (customerId: string) => {
      const customer = customers?.find((c) => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setSelectedCustomerId(customerId);
        form.setValue('customer', customerId);
        form.setValue('services', '');
        form.setValue('item', '');
        form.setValue('sector_service_id', '');
        form.setValue('areas_service_id', '');
        setSelectedServiceId(null);

        const hasSectors = customer.customer_services?.some((s: any) => s.service_sectors?.length > 0);
        const hasAreas = customer.customer_services?.some((s: any) => s.service_areas?.length > 0);

        setIsSectorDisabled(!hasSectors);
        setIsAreaDisabled(!hasAreas);
      }
    },
    [customers, form]
  );

  // Manejar cambio de servicio
  const handleServiceChange = useCallback(
    (serviceId: string) => {
      form.setValue('services', serviceId);
      form.setValue('item', '');
      form.setValue('sector_service_id', '');
      form.setValue('areas_service_id', '');
      setSelectedServiceId(serviceId);
    },
    [form]
  );

  return {
    selectedCustomerId,
    setSelectedCustomerId,
    selectedServiceId,
    setSelectedServiceId,
    selectedCustomer,
    setSelectedCustomer,
    customerServices,
    serviceItems,
    handleCustomerChange,
    handleServiceChange,
    isSectorDisabled,
    setIsSectorDisabled,
    isAreaDisabled,
    setIsAreaDisabled,
  };
}
