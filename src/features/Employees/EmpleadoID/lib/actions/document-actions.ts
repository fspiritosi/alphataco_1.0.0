'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import { Logger } from '@/lib/logger';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { COMPANY_USERS_INVALIDATION } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import moment from 'moment';
import { revalidatePath } from 'next/cache';
import type { Database } from '../../../../../../database.types';

const logger = new Logger('document-actions');

type ReasonForTermination = Database['public']['Enums']['reason_for_termination_enum'];
type DocumentState = Database['public']['Enums']['state'];

export async function fetchDocumentTypes() {
  const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-empleados', 'view_private');
  const supabase = await supabaseServer();

  let query = supabase.from('document_types').select('*').order('name', { ascending: true });

  if (!canViewPrivate) {
    query = query.eq('private', false);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching document types', { data: { error } });
    return [];
  }

  return data;
}
export async function toggleEmployeeStatus(
  employeeId: string,
  activate: boolean,
  reason_for_termination?: ReasonForTermination,
  termination_date?: Date
) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('employees')
    .update({
      is_active: activate,
      reason_for_termination: reason_for_termination || null,
      termination_date: termination_date ? moment(termination_date).format('YYYY-MM-DD') : null,
    })
    .eq('id', employeeId);

  if (error) {
    throw new Error(error.message);
  }

  // Actualizar diagrama del empleado
  await supabase.rpc('update_employee_diagram_status', {
    p_employee_id: employeeId,
    p_is_active: activate,
  });

  // Ban/unban del usuario vinculado al empleado + sync share_company_users.is_active
  try {
    const { data: profile } = await supabase
      .from('profile')
      .select('credential_id, id')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (profile?.credential_id) {
      const adminSupabase = await adminSupabaseServer();
      const { error: banError } = await adminSupabase.auth.admin.updateUserById(profile.credential_id, {
        ban_duration: activate ? 'none' : '876600h',
      });

      if (banError) {
        logger.warn('No se pudo actualizar ban del usuario', {
          data: { error: banError, employeeId, activate },
        });
      } else {
        logger.info(`Usuario ${activate ? 'desbaneado' : 'baneado'} exitosamente`, {
          data: { employeeId, credentialId: profile.credential_id },
        });

        // Sincronizar share_company_users.is_active con el estado del ban
        try {
          await prisma.share_company_users.updateMany({
            where: { profile_id: profile.id },
            data: { is_active: activate },
          });

          // Invalidar cache de la tabla de usuarios de empresa
          await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
        } catch (syncErr) {
          logger.warn('No se pudo sincronizar is_active en share_company_users', {
            data: { error: syncErr, profileId: profile.id, activate },
          });
        }
      }
    }
  } catch (banErr) {
    logger.error('Error en proceso de ban/unban', { data: { error: banErr, employeeId } });
  }

  revalidatePath('/dashboard/employee/action');
  revalidatePath('/dashboard/employee');
}
export async function uploadEmployeeDocument(
  employeeId: string,
  documentData: {
    document_name: string;
    document_url: string;
    document_type_id: string;
    expiration_date?: string;
    is_required: boolean;
  }
) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('documents_employees')
    .insert({
      ...documentData,
      applies: employeeId,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error uploading document', { data: { error } });
    throw new Error(error.message);
  }

  return data;
}

export async function updateDocumentStatus(documentId: string, status: DocumentState) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('documents_employees')
    .update({ state: status })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating document status', { data: { error } });
    throw new Error(error.message);
  }

  return data;
}
