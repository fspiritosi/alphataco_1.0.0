'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { customersSchema } from '@/zodSchemas/schemas';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Función para verificar si un área está siendo usada en contratos
async function isAreaUsedInContracts(areaId: string) {
  const supabase = await supabaseServer();

  try {
    // 1. Buscar todos los servicios que usan esta área
    const { data: serviceAreas, error: serviceAreaError } = await supabase
      .from('service_areas')
      .select('service_id')
      .eq('area_id', areaId);

    if (serviceAreaError) {
      console.error('Error al buscar servicios que usan el área:', serviceAreaError);
      throw serviceAreaError;
    }

    if (!serviceAreas || serviceAreas.length === 0) {
      return { isUsed: false };
    }

    const serviceIds = serviceAreas.map((sa) => sa.service_id);

    // 2. Buscar contratos (customer_services) que usen estos servicios
    const { data: contracts, error: contractsError } = await supabase
      .from('customer_services')
      .select(
        `
        id, 
        contract_number,
        customer_id,
        service_name,
        is_active
      `
      )
      .in('id', serviceIds)
      .eq('is_active', true) // Solo contratos activos
      .order('created_at', { ascending: true }) // Ordenar por fecha para obtener el más antiguo primero
      .limit(1); // Solo necesitamos el primer contrato

    if (contractsError) {
      console.error('Error al verificar contratos del área:', contractsError);
      throw contractsError;
    }

    if (contracts && contracts.length > 0) {
      const contract = contracts[0]; // Tomamos el primer contrato

      // Obtener el nombre del cliente
      let customerName = 'Cliente desconocido';
      if (contract.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', contract.customer_id)
          .single();

        if (customer) {
          customerName = customer.name;
        }
      }

      return {
        isUsed: true,
        contract: {
          id: contract.id,
          contractNumber: contract.contract_number || 'Sin número',
          serviceName: contract.service_name || 'Sin nombre',
          customerName,
          isActive: contract.is_active,
        },
      };
    }

    return { isUsed: false };
  } catch (error) {
    console.error('Error en isAreaUsedInContracts:', error);
    throw error;
  }
}
export async function createdCustomer(formData: FormData) {
  const supabase = await supabaseServer();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data } = await supabase
      .from('profile')
      .select('*')
      .eq('email', session?.user.email || '');

    const { data: Companies, error } = await supabase
      .from('company')
      .select(`*`)
      .eq('owner_id', data?.[0]?.id || '');

    let { data: share_company_users, error: sharedError } = await supabase
      .from('share_company_users')
      .select(`*`)
      .eq('profile_id', data?.[0]?.id || '');

    revalidatePath('/dashboard/company/customers');

    const form = Object.fromEntries(formData.entries());

    const client = customersSchema.parse(form);

    const clientData = {
      name: client.company_name,
      cuit: client.client_cuit,
      client_email: client.client_email,
      client_phone: client.client_phone,
      address: client.address,
      // company_id: Companies?.[0].id
      company_id: formData.get('company_id'),
    };

    const { data: existingClient, error: clientError } = await supabase
      .from('customers')
      .select('*')
      .eq('name', clientData.name)
      .eq('cuit', clientData.cuit)
      .eq('client_email', clientData.client_email || '')
      .eq('client_phone', clientData.client_phone || '')
      .eq('address', clientData.address || '')
      .eq('company_id', clientData.company_id || '')
      .single();

    if (existingClient) {
      return { status: 400, body: 'El cliente ya existe en esta empresa' };
    }

    // Guardar datos en la tabla 'customer'
    const newClient = await supabase
      .from('customers')
      .insert(clientData as any)
      .select();
    if (newClient) {
      return { status: 201, body: 'Cliente creado satisfactoriamente.' };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 400, body: JSON.stringify(error.errors) };
    }
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
  redirect('/dashboard/company/actualCompany');
}

export async function updateCustomer(formData: FormData) {
  const supabase = await supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data } = await supabase
    .from('profile')
    .select('*')
    .eq('email', session?.user.email || '');

  const { data: Companies, error } = await supabase
    .from('company')
    .select(`*`)
    .eq('owner_id', data?.[0]?.id || '');

  let { data: share_company_users, error: sharedError } = await supabase
    .from('share_company_users')
    .select(`*`)
    .eq('profile_id', data?.[0]?.id || '');

  revalidatePath('/dashboard/company/actualCompany');

  const id = formData.get('id');

  const clientData = {
    name: formData.get('company_name'),
    cuit: formData.get('client_cuit'),
    client_email: formData.get('client_email'),
    client_phone: formData.get('client_phone'),
    address: formData.get('address'),
    company_id: formData.get('company_id'),
  };

  try {
    // Guardar datos en la tabla 'customer'
    const editClient = await supabase
      .from('customers')
      .update([clientData] as any)
      .eq('id', id || '')
      .select();

    return {
      status: 303,
      redirect: '/dashboard/company/actualCompany',
      body: 'Cliente actualizado satisfactoriamente',
    };
  } catch (error) {
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

export async function fechAllDataCustomersById(id: string) {
  const supabase = await supabaseServer();
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(
        '*,contractor_employee(employees(*,company_positions(*),hierarchy(*),cities(*),provinces(*),work_diagram(*),countries(*),contractor_employee(*),cost_center(*)))'
      )
      // .eq('is_active', true)
      .eq('id', id || '')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fechAllCustomers() {
  const supabase = await supabaseServer();
  const coockiesStore = await cookies();
  const actualCompany = coockiesStore.get('actualComp')?.value;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', actualCompany || '')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createArea(values: any) {
  const supabase = await supabaseServer();
  try {
    const { data: area, error: areaError } = await supabase
      .from('areas_cliente' as any)
      .insert({
        nombre: values.name,
        descripcion_corta: values.descripcion_corta,
        customer_id: values.customer_id,
      })
      .select('*');

    if (areaError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    const areaId = area?.[0]?.id;
    const provinceId = values.province_id as number[];
    const provinces = provinceId.map((id: number) => ({
      area_id: areaId,
      province_id: id,
    }));

    const { error: provinceError } = await supabase.from('area_province' as any).insert(provinces as any);

    if (provinceError) {
      // Si falla el insert en areas_province, eliminamos el area recien creado
      await supabase
        .from('areas_cliente' as any)
        .delete()
        .match({ id: areaId });
      return { status: 500, body: 'Internal Server Error' };
    }

    // revalidatePath('/dashboard/company/actualCompany');
    return { status: 200, body: 'Area creada satisfactoriamente' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 400, body: JSON.stringify(error.errors) };
    }
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

export async function updateArea(values: any) {
  const supabase = await supabaseServer();
  try {
    // Primero obtenemos el área actual para comparar
    const { data: currentArea, error: fetchError } = await supabase
      .from('areas_cliente')
      .select('customer_id')
      .eq('id', values.id)
      .single();

    if (fetchError) {
      return { status: 500, body: 'Error al obtener los datos del área' };
    }

    // Verificar si se está intentando cambiar el cliente
    if (currentArea.customer_id !== values.customer_id) {
      try {
        // Verificar si el área está siendo usada en contratos
        const isUsed = await isAreaUsedInContracts(values.id);
        if (isUsed.isUsed) {
          const contract = isUsed.contract;
          return {
            status: 400,
            body: `No se puede actualizar el área porque está siendo utilizada en el contrato ${contract?.contractNumber} (${contract?.serviceName}) del cliente ${contract?.customerName}.`,
          };
        }
      } catch (error) {
        console.error('Error al verificar contratos del área:', error);
        return { status: 500, body: 'Error al verificar los contratos del área' };
      }
    }

    // Si todo está bien, proceder con la actualización
    const { data: area, error: areaError } = await supabase
      .from('areas_cliente' as any)
      .update({
        nombre: values.name,
        descripcion_corta: values.descripcion_corta,
        customer_id: values.customer_id,
      })
      .eq('id', values.id)
      .select('*');

    if (areaError) {
      return { status: 500, body: 'Error al actualizar el área' };
    }

    const provinceId = values.province_id as number[];
    const provinces = provinceId.map((id: number) => ({
      area_id: values.id,
      province_id: id,
    }));

    const { error: provinceError } = await supabase
      .from('area_province' as any)
      .delete()
      .eq('area_id', values.id);

    if (provinceError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    const { error: provinceInsertError } = await supabase.from('area_province' as any).insert(provinces as any);

    if (provinceInsertError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    return { status: 200, body: 'Area actualizada satisfactoriamente' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 400, body: JSON.stringify(error.errors) };
    }
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

export async function fetchAreasWithProvinces() {
  const supabase = await supabaseServer();
  const coockiesStore = await cookies();
  const actualCompany = coockiesStore.get('actualComp')?.value;

  try {
    const { data, error } = await supabase
      .from('areas_cliente')
      .select(
        `
        id,
        nombre,
        descripcion_corta,
        customers!inner (
          id,
          name,
          company_id
        ),
        area_province (
          provinces ( id, name )
        )
      `
      )
      .eq('customers.company_id', actualCompany || '')
      .not('area_province.province_id', 'is', null)
      .order('nombre', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchEquipmentsCustomers() {
  const supabase = await supabaseServer();
  try {
    const { data: equipments, error } = await supabase
      .from('equipos_clientes')
      .select('*,customers(*)')
      .order('name', { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return equipments;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createEquipmentCustomer(values: any) {
  const supabase = await supabaseServer();
  try {
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipos_clientes' as any)
      .insert({
        name: values.name,
        customer_id: values.customer_id,
        type: values.type,
      })
      .select('*');

    if (equipmentError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    return { status: 200, body: 'Equipo creado satisfactoriamente' };
  } catch (error) {
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

export async function updateEquipmentCustomer(values: any) {
  const supabase = await supabaseServer();

  try {
    const { data: equipment, error } = await supabase
      .from('equipos_clientes' as any)
      .update({
        name: values.name,
        customer_id: values.customer_id,
        type: values.type,
      })
      .eq('id', values.id)
      .select('*'); // traer el equipo actualizado

    if (error) {
      console.error('Error updating equipment:', error.message);
      return { status: 500, body: error.message };
    }

    if (!equipment || equipment?.length === 0) {
      return { status: 404, body: 'Equipo no encontrado o no actualizado.' };
    }

    return { status: 200, body: 'Equipo actualizado satisfactoriamente' };
  } catch (error) {
    console.error('Unexpected error updating equipment:', error);
    return { status: 500, body: 'Unexpected server error.' };
  }
}

export async function fetchAllSectors() {
  const supabase = await supabaseServer();
  try {
    const { data: sectors, error } = await supabase
      .from('sectors')
      .select('*,sector_customer(*, customers(*))')
      .order('name', { ascending: true });
    // .returns<SectorWithCustomers[]>();

    if (error) {
      console.error(error);
      return [];
    }
    return sectors;
  } catch (error) {
    console.error(error);
    return [];
  }
}
export async function fetchAllContractorSectorBySectorIds(sectorIds: string[]) {
  const supabase = await supabaseServer();
  try {
    const { data: sectors, error } = await supabase
      .from('sector_customer')
      .select('*,sectors(*),customers(*)')
      .in('sector_id', sectorIds)
      .order('sectors(name)', { ascending: true });
    // .returns<SectorWithCustomers[]>();

    if (error) {
      console.error(error);
      return [];
    }
    return sectors;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createSector(values: any) {
  const supabase = await supabaseServer();
  try {
    const { data: sector, error: sectorError } = await supabase
      .from('sectors' as any)
      .insert({
        name: values.name,
        descripcion_corta: values.descripcion_corta,
      })
      .select('*');

    if (sectorError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    const sectorId = sector?.[0]?.id;

    const { error: sectorCustomerError } = await supabase.from('sector_customer' as any).insert({
      sector_id: sectorId,
      customer_id: values.customer_id,
    });

    if (sectorCustomerError) {
      await supabase
        .from('sectors' as any)
        .delete()
        .match({ id: sectorId });
      return { status: 500, body: 'Internal Server Error' };
    }

    // revalidatePath('/dashboard/company/actualCompany');
    return { status: 200, body: 'Sector creado satisfactoriamente' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 400, body: JSON.stringify(error.errors) };
    }
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

export async function updateSector(values: any) {
  const supabase = await supabaseServer();

  try {
    const { data: sector, error: sectorError } = await supabase
      .from('sectors' as any)
      .update({
        name: values.name,
        descripcion_corta: values.descripcion_corta,
      })
      .eq('id', values.id)
      .select('*');

    if (sectorError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    const customerIds = Array.isArray(values.customer_id) ? values.customer_id : [values.customer_id];

    const customers = customerIds.map((id: string) => ({
      sector_id: values.id,
      customer_id: id,
    }));

    const { error: deleteError } = await supabase
      .from('sector_customer' as any)
      .delete()
      .eq('sector_id', values.id);

    if (deleteError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    const { error: insertError } = await supabase.from('sector_customer' as any).insert(customers);

    if (insertError) {
      return { status: 500, body: 'Internal Server Error' };
    }

    return { status: 200, body: 'Sector actualizado satisfactoriamente' };
  } catch (error) {
    console.error(error);
    return { status: 500, body: 'Internal Server Error' };
  }
}
