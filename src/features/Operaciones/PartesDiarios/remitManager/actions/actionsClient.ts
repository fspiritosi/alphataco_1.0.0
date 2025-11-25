'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';

// =====================================================
// FUNCIONES DE CONSULTA (READ)
// =====================================================

export async function getRemitosWithDocumentsClient(dailyReportRowId: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('remitos')
    .select(
      `
      *,
      remito_documents(*)
    `
    )
    .eq('daily_report_row_id', dailyReportRowId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAvailableDocumentsForLinkingClient(dailyReportRowId: string, currentRemitId?: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('remito_documents')
    .select(
      `
      *,
      remitos!inner(
        id,
        remit_number,
        daily_report_row_id
      )
    `
    )
    .eq('remitos.daily_report_row_id', dailyReportRowId)
    .neq('remitos.id', currentRemitId || '')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAvailableRemitosForLinkingClient(currentDailyReportRowId: string, searchQuery?: string) {
  const supabase = supabaseBrowser();

  // Primero obtener el customer_id del dailyReportRow actual
  const { data: currentRow, error: currentRowError } = await supabase
    .from('dailyreportrows')
    .select('customer_id')
    .eq('id', currentDailyReportRowId)
    .single();

  if (currentRowError) throw currentRowError;

  let query = supabase
    .from('remitos')
    .select(
      `
      *,
      remito_documents(count),
      dailyreportrows!inner(
        id,
        customer_id,
        customers(
          id,
          name
        ),
        dailyreport!inner(
          id,
          date
        )
      )
    `
    )
    .neq('daily_report_row_id', currentDailyReportRowId);

  // Si hay búsqueda, filtrar por número de remito
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike('remit_number', `%${searchQuery.trim()}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(10);

  if (error) throw error;

  // Agregar flag para indicar si el remito pertenece al mismo cliente
  const remitosWithClientMatch = (data || []).map((remito) => ({
    ...remito,
    isSameCustomer: remito.dailyreportrows?.customer_id === currentRow.customer_id,
    currentCustomerId: currentRow.customer_id,
  }));

  return remitosWithClientMatch;
}

// =====================================================
// FUNCIONES DE CREACIÓN (CREATE)
// =====================================================

export async function createRemitoClient(dailyReportRowId: string, remitNumber: string) {
  const supabase = supabaseBrowser();

  const { data: existing } = await supabase
    .from('remitos')
    .select('id')
    .eq('daily_report_row_id', dailyReportRowId)
    .eq('remit_number', remitNumber)
    .single();

  if (existing) {
    throw new Error(`Ya existe un remito con el número ${remitNumber}`);
  }

  const { data, error } = await supabase
    .from('remitos')
    .insert({
      daily_report_row_id: dailyReportRowId,
      remit_number: remitNumber,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadDocumentToRemitoClient(remitId: string, file: File, customerName?: string) {
  const supabase = supabaseBrowser();

  const { data: remito, error: remitoError } = await supabase
    .from('remitos')
    .select('remit_number')
    .eq('id', remitId)
    .single();

  if (remitoError) throw remitoError;

  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const fileName = `remito-${remito.remit_number}-${timestamp}.${fileExtension}`;

  const storagePath = customerName ? `${customerName}/${fileName}` : `remitos/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('daily-reports')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: documentData, error: documentError } = await supabase
    .from('remito_documents')
    .insert({
      remit_id: remitId,
      document_path: uploadData.path,
      document_name: file.name,
    })
    .select()
    .single();

  if (documentError) {
    await supabase.storage.from('daily-reports').remove([uploadData.path]);
    throw documentError;
  }

  return documentData;
}

export async function linkExistingDocumentClient(remitId: string, documentPath: string, documentName: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('remito_documents')
    .insert({
      remit_id: remitId,
      document_path: documentPath,
      document_name: documentName,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function linkExistingRemitoClient(sourceRemitId: string, targetDailyReportRowId: string) {
  const supabase = supabaseBrowser();

  // Obtener el remito original con sus documentos
  const { data: sourceRemito, error: sourceError } = await supabase
    .from('remitos')
    .select(
      `
      *,
      remito_documents(*)
    `
    )
    .eq('id', sourceRemitId)
    .single();

  if (sourceError) throw sourceError;

  // Verificar si ya existe un remito con el mismo número en la row destino
  const { data: existing } = await supabase
    .from('remitos')
    .select('id')
    .eq('daily_report_row_id', targetDailyReportRowId)
    .eq('remit_number', sourceRemito.remit_number)
    .single();

  if (existing) {
    throw new Error(`Ya existe un remito con el número ${sourceRemito.remit_number} en esta línea`);
  }

  // Crear el nuevo remito en la row destino marcándolo como vinculado
  const { data: newRemito, error: createError } = await supabase
    .from('remitos')
    .insert({
      daily_report_row_id: targetDailyReportRowId,
      remit_number: sourceRemito.remit_number,
      is_linked: true,
    })
    .select()
    .single();

  if (createError) throw createError;

  // Vincular todos los documentos del remito original al nuevo remito
  if (sourceRemito.remito_documents && sourceRemito.remito_documents.length > 0) {
    const documentsToLink = sourceRemito.remito_documents.map((doc: any) => ({
      remit_id: newRemito.id,
      document_path: doc.document_path,
      document_name: doc.document_name,
    }));

    const { error: linkError } = await supabase.from('remito_documents').insert(documentsToLink);

    if (linkError) {
      // Si falla, eliminar el remito creado
      await supabase.from('remitos').delete().eq('id', newRemito.id);
      throw linkError;
    }
  }

  return newRemito;
}

// =====================================================
// FUNCIONES DE ACTUALIZACIÓN (UPDATE)
// =====================================================

export async function updateRemitoNumberClient(remitId: string, newRemitNumber: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('remitos')
    .update({
      remit_number: newRemitNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', remitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function replaceDocumentClient(documentId: string, newFile: File, customerName?: string) {
  const supabase = supabaseBrowser();

  const { data: currentDoc, error: currentDocError } = await supabase
    .from('remito_documents')
    .select(
      `
      *,
      remitos(remit_number)
    `
    )
    .eq('id', documentId)
    .single();

  if (currentDocError) throw currentDocError;

  const fileExtension = newFile.name.split('.').pop();
  const timestamp = Date.now();
  const fileName = `remito-${(currentDoc.remitos as any).remit_number}-${timestamp}.${fileExtension}`;

  const storagePath = customerName ? `${customerName}/${fileName}` : `remitos/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('daily-reports')
    .upload(storagePath, newFile, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: updatedDoc, error: updateError } = await supabase
    .from('remito_documents')
    .update({
      document_path: uploadData.path,
      document_name: newFile.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single();

  if (updateError) {
    await supabase.storage.from('daily-reports').remove([uploadData.path]);
    throw updateError;
  }

  await supabase.storage.from('daily-reports').remove([currentDoc.document_path]);
  return updatedDoc;
}

// =====================================================
// FUNCIONES DE ELIMINACIÓN (DELETE)
// =====================================================

export async function deleteDocumentClient(documentId: string) {
  const supabase = supabaseBrowser();

  const { data: document, error: docError } = await supabase
    .from('remito_documents')
    .select('document_path')
    .eq('id', documentId)
    .single();

  if (docError) throw docError;

  const { error: deleteError } = await supabase.from('remito_documents').delete().eq('id', documentId);

  if (deleteError) throw deleteError;

  await supabase.storage.from('daily-reports').remove([document.document_path]);
  return true;
}

export async function deleteRemitoClient(remitId: string) {
  const supabase = supabaseBrowser();

  const { data: documents, error: docsError } = await supabase
    .from('remito_documents')
    .select('id, document_path')
    .eq('remit_id', remitId);

  if (docsError) throw docsError;

  if (documents && documents.length > 0) {
    for (const doc of documents) {
      await deleteDocumentClient(doc.id);
    }
  }

  const { error: deleteError } = await supabase.from('remitos').delete().eq('id', remitId);

  if (deleteError) throw deleteError;
  return true;
}

export async function unlinkRemitoClient(remitId: string) {
  const supabase = supabaseBrowser();

  // Verificar que el remito sea vinculado
  const { data: remito, error: remitoError } = await supabase
    .from('remitos')
    .select('is_linked')
    .eq('id', remitId)
    .single();

  if (remitoError) throw remitoError;

  if (!remito.is_linked) {
    throw new Error('Este remito no es vinculado y no puede ser desvinculado');
  }

  // Eliminar solo las referencias de documentos (no los archivos físicos)
  const { error: deleteDocsError } = await supabase.from('remito_documents').delete().eq('remit_id', remitId);

  if (deleteDocsError) throw deleteDocsError;

  // Eliminar el remito (solo la referencia, los documentos originales quedan intactos)
  const { error: deleteError } = await supabase.from('remitos').delete().eq('id', remitId);

  if (deleteError) throw deleteError;
  return true;
}

// =====================================================
// FUNCIONES UTILITARIAS
// =====================================================

export async function downloadDocumentClient(documentPath: string, documentName: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.storage.from('daily-reports').download(documentPath);

  if (error) throw error;

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = documentName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

export async function getDocumentUrlClient(documentPath: string) {
  const supabase = supabaseBrowser();
  const { data } = supabase.storage.from('daily-reports').getPublicUrl(documentPath);
  return data.publicUrl;
}

// =====================================================
// EXPORTAR TIPOS
// =====================================================

export type RemitoWithDocuments = Awaited<ReturnType<typeof getRemitosWithDocumentsClient>>[number];
export type RemitDocument = Awaited<
  ReturnType<typeof getRemitosWithDocumentsClient>
>[number]['remito_documents'][number];
export type AvailableDocument = Awaited<ReturnType<typeof getAvailableDocumentsForLinkingClient>>[number];
export type AvailableRemito = Awaited<ReturnType<typeof getAvailableRemitosForLinkingClient>>[number];
export type Remito = Awaited<ReturnType<typeof createRemitoClient>>;
