import { logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';

export async function handleSubmit(
  values: {
    item_name?: string;
    item_description?: string | null;
    code_item?: string | null;
    item_number?: string | null;
    item_price?: number;
    item_measure_units?: string;
    is_active?: boolean;
    needs_personnel?: boolean;
    needs_equipment?: boolean;
    customer_id?: string;
    customer_service_id?: string;
  },
  editingService: { id?: string } | null | undefined,
  // editService es el servicio (customer_service) cuyo id se usa como customer_service_id del item
  editService: { id?: string; company_id?: string | null; [key: string]: unknown } | null | undefined,
  company_id: string,
  isEditing: boolean,
  reset: () => void,
  onSuccess?: () => void
) {
  const supabase = supabaseBrowser();
  try {
    const { error } = isEditing
      ? await supabase
          .from('service_items')
          .update({
            item_name: values.item_name,
            item_description: values.item_description ?? undefined,
            code_item: values.code_item,
            item_number: values.item_number,
            item_measure_units: Number(values.item_measure_units),
            item_price: values.item_price,
            is_active: values.is_active,
            needs_personnel: values.needs_personnel ?? true,
            needs_equipment: values.needs_equipment ?? true,
            company_id: editService?.company_id ?? undefined,
          })
          .eq('id', editingService?.id ?? '')
      : await supabase.from('service_items').insert({
          customer_service_id: editService?.id ?? '',
          item_name: values.item_name ?? '',
          item_description: values.item_description ?? '',
          code_item: values.code_item,
          item_number: values.item_number,
          item_measure_units: Number(values.item_measure_units),
          item_price: values.item_price ?? 0,
          is_active: values.is_active,
          needs_personnel: values.needs_personnel ?? true,
          needs_equipment: values.needs_equipment ?? true,
          company_id: editService?.company_id ?? company_id,
        });

    if (error) {
      throw new Error(`Error al ${isEditing ? 'actualizar' : 'crear'} el item: ${error.message}`);
    }

    toast.success(`Item ${isEditing ? 'actualizado' : 'creado'} correctamente`);

    if (!isEditing) {
      reset();
    }

    // Llamar al callback de éxito si está definido
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    logger.error(`Error al ${isEditing ? 'actualizar' : 'crear'} el item`, { data: { error } });
    toast.error(`Error al ${isEditing ? 'actualizar' : 'crear'} el item`);
  }
}

export async function fetchServiceItems(customer_service_id: string) {
  const supabase = supabaseBrowser();

  try {
    // Primero obtenemos los items con las unidades de medida
    const { data: items, error } = await supabase
      .from('service_items')
      .select(
        `
        *,
        item_measure_units (
          id,
          unit
        ),
        customer_services!inner (
          id,
          service_name,
          customer_id
        )
      `
      )
      .eq('customer_service_id', customer_service_id);

    if (error) {
      logger.error('Error al obtener items del servicio', { data: { error } });
      return [];
    }

    if (!items || items.length === 0) {
      return [];
    }

    // Obtenemos los IDs únicos de clientes
    const customerIds = [...new Set(items.map((item) => item.customer_services?.customer_id).filter(Boolean))];

    // Obtenemos los datos de los clientes
    const { data: customers = [], error: customersError } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds);

    if (customersError) {
      logger.error('Error al obtener clientes', { data: { error: customersError } });
      // Continuamos sin los datos de los clientes
    }

    // Mapeamos los items para incluir los datos de los clientes
    return items.map((item) => ({
      ...item,
      customer_services: {
        ...item.customer_services,
        customer_id: customers?.find((c) => c.id === item.customer_services?.customer_id) || null,
      },
    }));
  } catch (error) {
    logger.error('Error inesperado al obtener items del servicio', { data: { error } });
    return [];
  }
}
