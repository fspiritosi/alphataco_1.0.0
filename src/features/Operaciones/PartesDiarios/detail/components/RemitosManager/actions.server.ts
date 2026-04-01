'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Operaciones/RemitosManager');

// =====================================================
// READ
// =====================================================

export async function getRemitosForRow(rowId: string) {
  logger.debug('Obteniendo remitos para row', { data: { rowId } });

  try {
    const remitos = await prisma.remitos.findMany({
      where: { daily_report_row_id: rowId },
      include: {
        remito_documents: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return remitos;
  } catch (error) {
    logger.error('Error al obtener remitos', { data: { error, rowId } });
    throw error;
  }
}

export type RemitosForRow = Awaited<ReturnType<typeof getRemitosForRow>>;
export type RemitoWithDocuments = RemitosForRow[number];
export type RemitoDocument = RemitoWithDocuments['remito_documents'][number];

// =====================================================
// GET AVAILABLE FOR LINKING
// =====================================================

export async function getAvailableRemitosForLinking(dailyReportId: string, excludeRowId: string) {
  logger.debug('Obteniendo remitos disponibles para vincular', { data: { dailyReportId, excludeRowId } });

  try {
    // Get all rows from the same daily report (excluding the current row)
    const remitos = await prisma.remitos.findMany({
      where: {
        dailyreportrows: {
          daily_report_id: dailyReportId,
          id: { not: excludeRowId },
        },
      },
      include: {
        remito_documents: true,
        dailyreportrows: {
          select: {
            id: true,
            customer_id: true,
            customers: {
              select: { id: true, name: true },
            },
            dailyreport: {
              select: { id: true, date: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Get the customer_id of the current row for same-customer highlighting
    const currentRow = await prisma.dailyreportrows.findUnique({
      where: { id: excludeRowId },
      select: { customer_id: true },
    });

    return remitos.map((remito) => ({
      ...remito,
      isSameCustomer: remito.dailyreportrows?.customer_id === currentRow?.customer_id,
    }));
  } catch (error) {
    logger.error('Error al obtener remitos disponibles para vincular', {
      data: { error, dailyReportId, excludeRowId },
    });
    throw error;
  }
}

export type AvailableRemitoForLinking = Awaited<ReturnType<typeof getAvailableRemitosForLinking>>[number];

// =====================================================
// CREATE
// =====================================================

export async function createRemito(rowId: string, remitNumber: string) {
  logger.debug('Creando remito', { data: { rowId, remitNumber } });

  try {
    // Check for duplicate remit number in same row
    const existing = await prisma.remitos.findFirst({
      where: {
        daily_report_row_id: rowId,
        remit_number: remitNumber,
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error(`Ya existe un remito con el número ${remitNumber}`);
    }

    const remito = await prisma.remitos.create({
      data: {
        daily_report_row_id: rowId,
        remit_number: remitNumber,
        is_linked: false,
      },
    });

    logger.info('Remito creado', { data: { remitoId: remito.id, remitNumber } });
    return remito;
  } catch (error) {
    logger.error('Error al crear remito', { data: { error, rowId, remitNumber } });
    throw error;
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function updateRemitoNumber(remitoId: string, number: string) {
  logger.debug('Actualizando número de remito', { data: { remitoId, number } });

  try {
    const remito = await prisma.remitos.update({
      where: { id: remitoId },
      data: {
        remit_number: number,
        updated_at: new Date(),
      },
    });

    logger.info('Número de remito actualizado', { data: { remitoId, number } });
    return remito;
  } catch (error) {
    logger.error('Error al actualizar número de remito', { data: { error, remitoId, number } });
    throw error;
  }
}

// =====================================================
// DELETE
// =====================================================

export async function deleteRemito(remitoId: string) {
  logger.debug('Eliminando remito', { data: { remitoId } });

  try {
    // Fetch all documents to delete from storage
    const documents = await prisma.remito_documents.findMany({
      where: { remit_id: remitoId },
      select: { id: true, document_path: true },
    });

    // Delete files from Supabase Storage
    if (documents.length > 0) {
      const supabase = await supabaseServer();
      const paths = documents.map((d) => d.document_path);
      const { error: storageError } = await supabase.storage.from('daily-reports').remove(paths);
      if (storageError) {
        logger.warn('Error al eliminar archivos del storage (se continua con el delete de BD)', {
          data: { storageError, paths },
        });
      }
    }

    // Delete remito (cascade deletes remito_documents records)
    await prisma.remitos.delete({
      where: { id: remitoId },
    });

    logger.info('Remito eliminado', { data: { remitoId } });
    return true;
  } catch (error) {
    logger.error('Error al eliminar remito', { data: { error, remitoId } });
    throw error;
  }
}

// =====================================================
// LINK / UNLINK
// =====================================================

/**
 * Links an existing remito to a different row by creating a new linked copy
 * with all its documents references.
 */
export async function linkExistingRemito(remitoId: string, targetRowId: string) {
  logger.debug('Vinculando remito existente', { data: { remitoId, targetRowId } });

  try {
    // Fetch source remito with its documents
    const sourceRemito = await prisma.remitos.findUnique({
      where: { id: remitoId },
      include: { remito_documents: true },
    });

    if (!sourceRemito) {
      throw new Error('Remito no encontrado');
    }

    // Check for duplicate in target row
    const existing = await prisma.remitos.findFirst({
      where: {
        daily_report_row_id: targetRowId,
        remit_number: sourceRemito.remit_number,
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error(`Ya existe un remito con el número ${sourceRemito.remit_number} en esta línea`);
    }

    // Create linked remito in target row
    const newRemito = await prisma.remitos.create({
      data: {
        daily_report_row_id: targetRowId,
        remit_number: sourceRemito.remit_number,
        is_linked: true,
        ...(sourceRemito.remito_documents.length > 0
          ? {
              remito_documents: {
                createMany: {
                  data: sourceRemito.remito_documents.map((doc) => ({
                    document_path: doc.document_path,
                    document_name: doc.document_name,
                  })),
                },
              },
            }
          : {}),
      },
    });

    logger.info('Remito vinculado', { data: { sourceRemitoId: remitoId, newRemitoId: newRemito.id } });
    return newRemito;
  } catch (error) {
    logger.error('Error al vincular remito', { data: { error, remitoId, targetRowId } });
    throw error;
  }
}

/**
 * Unlinks a linked remito — deletes the link record and its document references,
 * but keeps the original remito and physical files intact.
 */
export async function unlinkRemito(remitoId: string) {
  logger.debug('Desvinculando remito', { data: { remitoId } });

  try {
    const remito = await prisma.remitos.findUnique({
      where: { id: remitoId },
      select: { is_linked: true },
    });

    if (!remito) {
      throw new Error('Remito no encontrado');
    }

    if (!remito.is_linked) {
      throw new Error('Este remito no es vinculado y no puede ser desvinculado');
    }

    // Delete document DB records only (NOT the actual files from storage)
    await prisma.remito_documents.deleteMany({
      where: { remit_id: remitoId },
    });

    // Delete the linked remito record
    await prisma.remitos.delete({
      where: { id: remitoId },
    });

    logger.info('Remito desvinculado', { data: { remitoId } });
    return true;
  } catch (error) {
    logger.error('Error al desvincular remito', { data: { error, remitoId } });
    throw error;
  }
}

// =====================================================
// DOCUMENTS
// =====================================================

/**
 * Creates a document DB record after the file has been uploaded client-side.
 */
export async function uploadRemitoDocument(remitoId: string, documentPath: string, documentName: string) {
  logger.debug('Creando registro de documento', { data: { remitoId, documentPath, documentName } });

  try {
    const document = await prisma.remito_documents.create({
      data: {
        remit_id: remitoId,
        document_path: documentPath,
        document_name: documentName,
      },
    });

    logger.info('Documento creado', { data: { documentId: document.id, remitoId } });
    return document;
  } catch (error) {
    logger.error('Error al crear registro de documento', { data: { error, remitoId } });
    throw error;
  }
}

/**
 * Deletes a document record from DB and removes the file from Supabase Storage.
 */
export async function deleteRemitoDocument(documentId: string) {
  logger.debug('Eliminando documento de remito', { data: { documentId } });

  try {
    const document = await prisma.remito_documents.findUnique({
      where: { id: documentId },
      select: { document_path: true },
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Delete DB record first
    await prisma.remito_documents.delete({
      where: { id: documentId },
    });

    // Then remove from storage (non-fatal if it fails)
    const supabase = await supabaseServer();
    const { error: storageError } = await supabase.storage.from('daily-reports').remove([document.document_path]);

    if (storageError) {
      logger.warn('Error al eliminar archivo del storage', { data: { storageError, documentId } });
    }

    logger.info('Documento eliminado', { data: { documentId } });
    return true;
  } catch (error) {
    logger.error('Error al eliminar documento', { data: { error, documentId } });
    throw error;
  }
}
