'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, Package, Trash2, Upload } from 'lucide-react';
import React from 'react';

import { useDeleteRemito, useUnlinkRemito } from '../hooks/useRemitos';
import { RemitTabProps } from '../types';
import { DocumentUploadArea } from './DocumentUploadArea';
import { DocumentViewer } from './DocumentViewer';

export function RemitTab({ remito, dailyReportRowId, customerName }: RemitTabProps) {
  const [showUpload, setShowUpload] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const deleteRemito = useDeleteRemito(dailyReportRowId);
  const unlinkRemito = useUnlinkRemito(dailyReportRowId);

  const isLinked = remito.is_linked === true;
  const mutation = isLinked ? unlinkRemito : deleteRemito;

  const handleDelete = async () => {
    await mutation.mutateAsync(remito.id);
    setShowDeleteDialog(false);
  };

  const hasDocuments = remito.remito_documents.length > 0;

  return (
    <div className="space-y-5">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4 bg-muted/30 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">Remito: {remito.remit_number}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={hasDocuments ? 'default' : 'outline'} className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {remito.remito_documents.length} {remito.remito_documents.length === 1 ? 'documento' : 'documentos'}
                  </Badge>
                  {!hasDocuments && (
                    <Badge variant="destructive" className="text-xs">
                      Sin documentos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={mutation.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isLinked ? 'Desvincular' : 'Eliminar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {!showUpload && !hasDocuments && (
            <Alert
              variant="default"
              className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 flex items-center"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 p-0" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-medium">Atención:</span> Este remito no tiene documentos asociados
                </AlertDescription>
              </div>
            </Alert>
          )}

          {!showUpload ? (
            <Button
              onClick={() => setShowUpload(true)}
              variant="outline"
              size="default"
              className="w-full border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Nuevo Documento
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Subir nuevo documento</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                  Cancelar
                </Button>
              </div>
              <DocumentUploadArea remitId={remito.id} dailyReportRowId={dailyReportRowId} customerName={customerName} />
            </div>
          )}
        </CardContent>
      </Card>

      {hasDocuments && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Documentos asociados ({remito.remito_documents.length})</h3>
          </div>
          <div className="grid gap-3">
            {remito.remito_documents.map((doc) => (
              <DocumentViewer
                key={doc.id}
                document={doc}
                dailyReportRowId={dailyReportRowId}
                customerName={customerName}
              />
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isLinked ? '¿Desvincular remito?' : '¿Eliminar remito?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isLinked ? (
                <>
                  ¿Está seguro que desea desvincular el remito <strong>{remito.remit_number}</strong>?
                  <br />
                  <span className="text-xs mt-2 block">
                    Nota: El remito y sus documentos originales permanecerán en el parte diario donde fue creado.
                  </span>
                </>
              ) : (
                <>
                  ¿Está seguro que desea eliminar el remito <strong>{remito.remit_number}</strong> y todos sus
                  documentos asociados? Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={mutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {mutation.isPending
                ? isLinked
                  ? 'Desvinculando...'
                  : 'Eliminando...'
                : isLinked
                  ? 'Desvincular'
                  : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
