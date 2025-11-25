'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteDocumentClient,
  downloadDocumentClient,
  getAvailableDocumentsForLinkingClient,
  getDocumentUrlClient,
  linkExistingDocumentClient,
  replaceDocumentClient,
  uploadDocumentToRemitoClient,
} from '../actions/actionsClient';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../types';
import { remitoQueryKeys } from './useRemitos';

export const documentQueryKeys = {
  all: ['documents'] as const,
  available: (rowId: string, remitId?: string) => ['documents', 'available', rowId, remitId] as const,
  url: (documentPath: string) => ['documents', 'url', documentPath] as const,
};

export function useAvailableDocuments(dailyReportRowId: string, currentRemitId?: string) {
  return useQuery({
    queryKey: documentQueryKeys.available(dailyReportRowId, currentRemitId),
    queryFn: () => getAvailableDocumentsForLinkingClient(dailyReportRowId, currentRemitId),
    staleTime: 2 * 60 * 1000,
    enabled: !!dailyReportRowId,
  });
}

export function useDocumentUrl(documentPath: string) {
  return useQuery({
    queryKey: documentQueryKeys.url(documentPath),
    queryFn: () => getDocumentUrlClient(documentPath),
    staleTime: 10 * 60 * 1000,
    enabled: !!documentPath,
  });
}

export function useUploadDocument(dailyReportRowId: string, customerName?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ remitId, file }: { remitId: string; file: File }) =>
      uploadDocumentToRemitoClient(remitId, file, customerName),
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({
        queryKey: remitoQueryKeys.byRowId(dailyReportRowId),
      });
      queryClient.invalidateQueries({
        queryKey: documentQueryKeys.available(dailyReportRowId),
      });
      toast.success(`Documento ${newDocument.document_name} subido`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al subir el documento');
    },
  });
}

export function useReplaceDocument(dailyReportRowId: string, customerName?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, newFile }: { documentId: string; newFile: File }) =>
      replaceDocumentClient(documentId, newFile, customerName),
    onSuccess: (updatedDocument) => {
      queryClient.invalidateQueries({
        queryKey: remitoQueryKeys.byRowId(dailyReportRowId),
      });
      toast.success(`Documento ${updatedDocument.document_name} reemplazado`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reemplazar el documento');
    },
  });
}

export function useDeleteDocument(dailyReportRowId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => deleteDocumentClient(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: remitoQueryKeys.byRowId(dailyReportRowId),
      });
      queryClient.invalidateQueries({
        queryKey: documentQueryKeys.available(dailyReportRowId),
      });
      toast.success('Documento eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el documento');
    },
  });
}

export function useLinkDocument(dailyReportRowId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      remitId,
      documentPath,
      documentName,
    }: {
      remitId: string;
      documentPath: string;
      documentName: string;
    }) => linkExistingDocumentClient(remitId, documentPath, documentName),
    onSuccess: (linkedDocument) => {
      queryClient.invalidateQueries({
        queryKey: remitoQueryKeys.byRowId(dailyReportRowId),
      });
      toast.success(`Documento ${linkedDocument.document_name} vinculado`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al vincular el documento');
    },
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: ({ documentPath, documentName }: { documentPath: string; documentName: string }) =>
      downloadDocumentClient(documentPath, documentName),
    onSuccess: () => {
      toast.success('Documento descargado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al descargar el documento');
    },
  });
}

export function useFileValidation() {
  const validateFile = (file: File) => {
    const errors: string[] = [];

    if (file.size > MAX_FILE_SIZE) {
      errors.push('El archivo no puede ser mayor a 10MB');
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
      errors.push('Solo se permiten archivos PDF, JPG, PNG o WebP');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  return { validateFile };
}
