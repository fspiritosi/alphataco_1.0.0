'use strict';
import { formatDocumentTypeName } from '@/shared/utils/legacy-mappers';
import { clsx, type ClassValue } from 'clsx';
import moment from 'moment';
import { twMerge } from 'tailwind-merge';
import { Logger } from './logger';
import { supabaseBrowser } from './supabase/browser';
import { supabaseServer } from './supabase/server';

const documentsLogger = new Logger('lib/utils/documents');
// eslint-disable-next-line react-hooks/rules-of-hooks
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCompanyName(companyName: string): string {
  // Transforma el nombre de la empresa eliminando los guiones bajos y convirtiendo a mayúsculas
  return companyName.replace(/_/g, ' ')?.toUpperCase();
}
export function validarCUIL(cuil: string) {
  // Elimina guiones y espacios
  cuil = cuil.replace(/[-\s]/g, '');

  // Verifica la longitud
  if (cuil?.length !== 11) {
    return false;
  }

  // Calcula el dígito verificador
  const coeficientes = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(cuil[i]) * coeficientes[i];
  }
  let digitoVerificador = 11 - (suma % 11);
  if (digitoVerificador === 11) {
    digitoVerificador = 0;
  }

  // Compara con el último dígito
  return parseInt(cuil[10]) === digitoVerificador;
}

export const FetchSharedUsers = async (companyId: string) => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('share_company_users')
    .select(
      `*,customer_id(*),profile_id(*),company_id(*,
        owner_id(*),
      share_company_users(*,
        profile(*)
      ),
      city (
        name,
        id
      ),
      province_id (
        name,
        id
      ),
      companies_employees (
        employees(
          *,
          city (
            name
          ),
          province(
            name
          ),
          workflow_diagram(
            name
          ),
          hierarchical_position(
            name
          ),
          birthplace(
            name
          ),
          contractor_employee(
            customers(
              *
            )
          )
        )
      )
    )`
    )
    .eq('company_id', companyId);

  if (error) {
    // return error;
    console.error(error);
    return [];
  } else {
    return data;
  }
};
export const FetchSharedUsersProfiles = async (companyId: string) => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('share_company_users')
    .select(
      `
      profile(*)
      `
    )
    .eq('company_id', companyId);

  if (error) {
    // return error;
    console.error(error);
    return [];
  } else {
    return data;
  }
};

export async function getActualRole(companyId: string, profile: string) {
  // const sharedUsers = (await FetchSharedUsers(companyId)) as any;
  const sharedUsers = await FetchSharedUsersProfiles(companyId);
  const user = sharedUsers?.find((e: any) => e.profile_id?.id === profile);

  if (user?.profile?.role) {
    return user?.profile.role;
  } else {
    return 'Owner';
  }
}

export function calculateNameOFDocument(
  company_name: string,
  company_cuit: string,
  applies: string,
  document_name: string,
  version: string,
  file_extension: string,
  resource: string
) {
  const formatedCompanyName = company_name.toLowerCase().replace(/ /g, '-');
  const formatedAppliesName = applies.toLowerCase().replace(/ /g, '-');
  const formatedDocumentTypeName = formatDocumentTypeName(document_name).replace(/ /g, '-');
  const formatedVersion = version.replace(/\./g, '-');
  const formatedFileExtension = file_extension.replace(/\./g, '-');

  return `${formatedCompanyName}-(${company_cuit})/${resource}/${formatedAppliesName}/${formatedDocumentTypeName}-(${formatedVersion}).${formatedFileExtension}`;
}
export async function verifyDuplicatedDocument(
  company_name: string,
  company_cuit: any,
  formatedAppliesPath: string,
  resource: string,
  formatedAppliesNames: string
) {
  const formatedCompanyName = company_name.toLowerCase().replace(/ /g, '-');
  const formatedAppliesName = formatedAppliesNames.toLowerCase().replace(/ /g, '-');
  const supabase = supabaseBrowser();
  const path = `${formatedCompanyName}-(${company_cuit})/${resource}/${formatedAppliesPath}`;

  const { data, error } = await supabase.storage.from('document-files').list(path);
  //     transporte-sp-srl-(30714153974)/persona/franco-ivan-andres-paratore

  if (error) {
    console.error('error', error);
    return true;
  }

  // Filtrar los resultados en el lado del cliente
  const fileExists = data?.some((file) => file.name.includes(formatedAppliesName));

  if (fileExists) {
    console.error('El documento ya existe');
    return true;
  }

  return false;
}
export const uploadDocumentFile = async (file: File, path: string, upsert = false) => {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage.from('document-files').upload(path, file, {
    cacheControl: '3600',
    upsert,
    contentType: file.type,
  });
  if (error) {
    documentsLogger.error('Error al subir el archivo del documento al storage', { data: { error, path } });
    // Propagar el error para que el formulario no cierre el modal como si hubiera funcionado
    throw new Error(error.message || 'No se pudo subir el archivo del documento');
  }
  return data;
};
export const uploadDocument = async (
  dataToUpdate: {
    created_at: string;
    applies: any;
    document_path: string;
    id_document_types: string;
    state: 'presentado' | 'rechazado' | 'aprobado' | 'vencido' | 'pendiente';
    user_id?: string | null;
    period?: string | undefined;
    validity?: string | undefined;
    policy_number?: string | undefined;
  },
  mandatory: boolean,
  tableName: 'documents_equipment' | 'documents_employees',
  multipleResources: boolean
) => {
  const supabase = supabaseBrowser();
  // Defensa: columna uuid nullable. Un '' provoca 400 (invalid input syntax for type uuid).
  // Quitar la clave cuando viene vacia para que Postgres reciba null, no ''.
  if (!dataToUpdate.user_id) {
    delete (dataToUpdate as { user_id?: string | null }).user_id;
  }
  if (mandatory) {
    if (multipleResources) {
      // Multirecurso obligatorio: garantizar que TODOS los recursos seleccionados queden con fila.
      // Se actualizan los registros que ya existen y se insertan los que falten (upsert manual),
      // para que ningun recurso seleccionado se quede sin el documento.
      const { applies, ...rest } = dataToUpdate;

      const { data: existingRows, error: fetchError } = await supabase
        .from(tableName)
        .select('applies')
        .in('applies', applies)
        .eq('id_document_types', dataToUpdate.id_document_types);

      if (fetchError) {
        documentsLogger.error('Error al consultar documentos existentes (multirecurso obligatorio)', {
          data: { fetchError, id_document_types: dataToUpdate.id_document_types },
        });
        throw new Error(fetchError.message || 'No se pudieron consultar los documentos existentes');
      }

      const existingApplies = new Set((existingRows ?? []).map((row) => row.applies));
      const existing = applies.filter((apply: string) => existingApplies.has(apply));
      const missing = applies.filter((apply: string) => !existingApplies.has(apply));

      if (existing.length > 0) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update(rest)
          .in('applies', existing)
          .eq('id_document_types', dataToUpdate.id_document_types);
        if (updateError) {
          documentsLogger.error('Error al actualizar documentos (multirecurso obligatorio)', { data: { updateError } });
          throw new Error(updateError.message || 'No se pudieron actualizar los documentos');
        }
      }

      if (missing.length > 0) {
        const dataToInsert = missing.map((apply: string) => ({ ...rest, applies: apply }));
        const { error: insertError } = await supabase.from(tableName).insert(dataToInsert);
        if (insertError) {
          documentsLogger.error('Error al crear documentos faltantes (multirecurso obligatorio)', {
            data: { insertError },
          });
          throw new Error(insertError.message || 'No se pudieron crear los documentos faltantes');
        }
      }
    } else {
      const { applies, ...rest } = dataToUpdate;
      const { error } = await supabase
        .from(tableName)
        .update(rest)
        .eq('applies', applies)
        .eq('id_document_types', dataToUpdate.id_document_types);

      if (error) {
        documentsLogger.error('Error al actualizar documento obligatorio', { data: { error } });
        throw new Error(error.message || 'No se pudo actualizar el documento');
      }
    }
  } else {
    // Crear el documento

    if (multipleResources) {
      // Insertar un registro por cada recurso seleccionado, todos apuntando al mismo document_path.
      const { applies, ...rest } = dataToUpdate;
      const dataToInsert = applies.map((apply: string) => ({
        ...rest,
        applies: apply,
      }));
      const { error } = await supabase.from(tableName).insert(dataToInsert);
      if (error) {
        documentsLogger.error('Error al crear documentos (multirecurso)', { data: { error } });
        throw new Error(error.message || 'No se pudieron crear los documentos');
      }
    } else {
      const { error } = await supabase
        .from(tableName)
        .insert({
          ...dataToUpdate,
          state: 'presentado',
        })
        .select('*');
      if (error) {
        documentsLogger.error('Error al crear documento', { data: { error } });
        throw new Error(error.message || 'No se pudo crear el documento');
      }
    }
  }
};

export const getAllDocumentsByIdDocumentTypeCientSide = async (
  selectedValue: string,
  company_id: string,
  tableName: 'documents_employees' | 'documents_equipment' = 'documents_employees'
): Promise<{ applies: string | null }[]> => {
  if (!company_id) return [];
  const supabase = supabaseBrowser();
  // Consultar la tabla correcta segun el tipo de recurso. El combobox solo necesita
  // `applies` para deshabilitar los recursos que ya tienen el documento.
  const { data, error } = await supabase
    .from(tableName)
    .select('applies')
    .eq('id_document_types', selectedValue)
    .neq('document_path', null)
    .is('archived_at', null);

  if (error) {
    documentsLogger.error('Error al obtener documentos por tipo de documento', { data: { error, tableName } });
    return [];
  }
  return data ?? [];
};

export const getOpenRepairsSolicitudesByArrayClientSide = async (
  vehiclesIds: string[],
  repairTypeId: string,
  company_id: string
) => {
  if (!company_id) return [];
  const supabase = supabaseBrowser();
  let { data, error } = await supabase
    .from('repair_solicitudes')
    .select('*,equipment_id(*)')
    .in('equipment_id', vehiclesIds)
    .eq('reparation_type', repairTypeId)
    .in('state', ['Pendiente', 'Esperando repuestos', 'En reparación'])
    .returns<RepairRequestWithVehicle[]>();

  if (error || !data) {
    //console.error('error', error);
    return [];
  }
  return data;
};

export const formatEmployeeDocuments = (doc: EmployeeDocumentWithContractors) => {
  return {
    date: moment(doc.created_at).format('DD/MM/YYYY'),
    allocated_to: doc.applies?.contractor_employee?.map((doc: any) => doc.contractors?.name).join(', '),
    documentName: doc.id_document_types?.name,
    state: doc.state,
    multiresource: doc.id_document_types?.multiresource ? 'Si' : 'No',
    isItMonthly: doc.id_document_types?.is_it_montlhy,
    validity: doc.validity,
    mandatory: doc.id_document_types?.mandatory ? 'Si' : 'No',
    id: doc.id,
    resource: `${doc.applies?.lastname?.charAt(0)?.toUpperCase()}${doc?.applies?.lastname.slice(
      1
    )} ${doc.applies?.firstname?.charAt(0)?.toUpperCase()}${doc?.applies?.firstname.slice(1)}`,
    document_number: doc.applies?.document_number,
    employee_id: doc.applies?.id,
    document_url: doc.document_path,
    is_active: doc.applies?.is_active,
    period: doc.period,
    applies: doc.id_document_types?.applies,
    id_document_types: doc.id_document_types?.id,
    intern_number: null,
  };
};

export const formatVehiculesDocuments = (doc: EquipmentDocumentDetailed) => {
  return {
    date: moment(doc.created_at).format('DD/MM/YYYY'),
    allocated_to: doc.applies?.type_of_vehicle?.name,
    documentName: doc.id_document_types?.name,
    state: doc.state,
    multiresource: doc.id_document_types?.multiresource ? 'Si' : 'No',
    isItMonthly: doc.id_document_types?.is_it_montlhy,
    validity: doc.validity,
    mandatory: doc.id_document_types?.mandatory ? 'Si' : 'No',
    id: doc.id,
    resource: `${doc.applies?.domain}`,
    vehicle_id: doc.applies?.id,
    is_active: doc.applies?.is_active,
    period: doc.period,
    applies: doc.id_document_types?.applies,
    resource_id: doc.applies?.id,
    id_document_types: doc.id_document_types?.id,
    intern_number: `${doc.applies?.intern_number}`,
    serie: doc.applies?.serie,
  };
};

/**
 * Mapea un equipo al formato esperado por NormalizedChecklistForm
 */
export const mapEquipmentToChecklistFormat = (
  equipment: Awaited<ReturnType<typeof import('@/shared/actions/equipment.actions').fetchAllEquipment>>[number]
) => {
  // Manejar subType que puede ser un objeto expandido o null
  let subTypeId: string | null = null;
  if (equipment.subType) {
    if (typeof equipment.subType === 'object' && 'id' in equipment.subType) {
      subTypeId = equipment.subType.id as string;
    } else if (typeof equipment.subType === 'string') {
      subTypeId = equipment.subType;
    }
  }

  // Manejar type que puede ser un objeto expandido
  let typeId: string | null = null;
  if (equipment.type) {
    if (typeof equipment.type === 'object' && 'id' in equipment.type) {
      typeId = String(equipment.type.id);
    } else if (typeof equipment.type === 'string') {
      typeId = equipment.type;
    } else if (typeof equipment.type === 'number') {
      typeId = String(equipment.type);
    }
  }

  return {
    label: equipment.domain
      ? `${equipment.domain} - ${equipment.intern_number || '(Sin información)'}`
      : `${equipment.serie} - ${equipment.intern_number || '(Sin información)'}`,
    value: equipment.id,
    domain: equipment.domain,
    serie: equipment.serie,
    kilometer: equipment.kilometer ?? '0',
    engine_hours: equipment.engine_hours ?? '0',
    model: equipment.model?.name || 'N/A',
    brand: equipment.brand?.name || 'N/A',
    intern_number: equipment.intern_number || '',
    sub_type_id: subTypeId,
    type_id: typeId,
    type_name: equipment.type?.name || 'N/A',
    sub_type_name: equipment.subType?.name || 'N/A',
  };
};
