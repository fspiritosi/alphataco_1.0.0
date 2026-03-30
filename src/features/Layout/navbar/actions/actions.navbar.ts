'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { getCachedSession } from '@/shared/lib/cached-session';
import { cookies } from 'next/headers';
import {
  EmployeeDocumentWithDocumentTypes,
  EquipmentDocumentWithDocumentTypes,
  FormattedNotifications,
} from '../types/navbar.types';

const logger = new Logger('features/Layout/navbar');

export async function updateProfileAvatar(userId: string, imageUrl: string) {
  const supabase = await supabaseServer();

  try {
    const { error } = await supabase.from('profile').update({ avatar: imageUrl }).eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error al actualizar avatar', { data: { error } });
    return { success: false, error };
  }
}

export async function deleteNotification(notificationId: string) {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  try {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error al eliminar la notificación', { data: { error } });
    return { success: false, error };
  }
}

export async function deleteAllNotifications() {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  try {
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error al eliminar notificaciones', { data: { error } });
    return { success: false, error };
  }
}

export async function getCurrentUserProfile() {
  const supabase = await supabaseServer();
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const { data, error } = await supabase.from('profile').select('*').eq('id', session.user.id).single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error al obtener perfil', { data: { error } });
    return null;
  }
}

export async function getUserNotifications() {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    // Primero obtenemos las notificaciones
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });

    if (notificationsError) throw notificationsError;
    if (!notifications) return [];

    // Luego obtenemos los documentos de empleados y equipos
    const documentIds = notifications.map((n) => n.document_id).filter(Boolean) as string[];

    const { data: employeeDocsResponse, error: employeeDocsError } = await supabase
      .from('documents_employees')
      .select('*,id_document_types(*),applies(*)')
      .in('id', documentIds)
      .returns<EmployeeDocumentWithDocumentTypes[]>();

    if (employeeDocsError) throw employeeDocsError;

    const { data: equipmentDocsResponse, error: equipmentDocsError } = await supabase
      .from('documents_equipment')
      .select('*,id_document_types(*),applies(*)')
      .in('id', documentIds)
      .returns<EquipmentDocumentWithDocumentTypes[]>();

    if (equipmentDocsError) throw equipmentDocsError;

    // Creamos un mapa de documentos
    const documentsMap = new Map();

    employeeDocsResponse?.forEach((doc) => {
      documentsMap.set(doc.id, {
        id: doc.id,
        documentName: doc.id_document_types.name,
        resource: doc.applies?.firstname + ' ' + doc.applies?.lastname || '',
        reference: 'employee' as const,
      });
    });

    equipmentDocsResponse?.forEach((doc) => {
      documentsMap.set(doc.id, {
        id: doc.id,
        documentName: doc.id_document_types.name,
        resource: doc.applies?.domain || doc.applies?.chassis || '',
        reference: 'vehicle' as const,
      });
    });

    const notificationsFormatted = notifications.map((notification) => ({
      id: notification.id,
      description: notification.description,
      category: notification.category,
      created_at: notification.created_at,
      document: documentsMap.get(notification.document_id) || {
        id: notification.document_id,
        documentName: 'Documento no encontrado',
        resource: '',
        reference: 'employee' as const,
      },
    })) as FormattedNotifications[];

    // Combinamos la información
    return notificationsFormatted;
  } catch (error) {
    logger.error('Error al obtener notificaciones', { data: { error } });
    return [];
  }
}
