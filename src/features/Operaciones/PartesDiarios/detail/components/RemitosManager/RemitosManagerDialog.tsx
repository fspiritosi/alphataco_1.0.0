'use client';

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download, FileText, Link2, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { AddRemitDialog } from './AddRemitDialog';
import { LinkRemitDialog } from './LinkRemitDialog';
import type { RemitoDocument, RemitoWithDocuments } from './actions.server';
import {
  deleteRemito,
  deleteRemitoDocument,
  getRemitosForRow,
  unlinkRemito,
  updateRemitoNumber,
} from './actions.server';

interface RemitosManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string | null;
  dailyReportId: string;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------
const remitoQueryKey = (rowId: string) => ['remitos', rowId] as const;

// ---------------------------------------------------------------------------
// Document URL helper (client-side — public URL from Supabase storage)
// ---------------------------------------------------------------------------
function getPublicUrl(documentPath: string) {
  const supabase = supabaseBrowser();
  const { data } = supabase.storage.from('daily-reports').getPublicUrl(documentPath);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// DocumentList — collapsible list of documents for a remito
// ---------------------------------------------------------------------------
function DocumentList({
  documents,
  remitoId,
  rowId,
  onDocumentDeleted,
}: {
  documents: RemitoDocument[];
  remitoId: string;
  rowId: string;
  onDocumentDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmDeleteDocId, setConfirmDeleteDocId] = React.useState<string | null>(null);

  const deleteDocMutation = useMutation({
    mutationFn: (documentId: string) => deleteRemitoDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remitoQueryKey(rowId) });
      toast.success('Documento eliminado');
      onDocumentDeleted();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el documento');
    },
  });

  if (documents.length === 0) {
    return <p className="text-xs text-muted-foreground py-2 px-1">Sin documentos asociados</p>;
  }

  return (
    <>
      <div className="space-y-1.5">
        {documents.map((doc) => {
          const url = getPublicUrl(doc.document_path);
          return (
            <div key={doc.id} className="flex items-center gap-2 text-sm py-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{doc.document_name}</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Descargar"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setConfirmDeleteDocId(doc.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar documento"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmDeleteDocId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteDocId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              El archivo será eliminado permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteDocId) {
                  deleteDocMutation.mutate(confirmDeleteDocId);
                  setConfirmDeleteDocId(null);
                }
              }}
              disabled={deleteDocMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// RemitoCard — individual remito item
// ---------------------------------------------------------------------------
function RemitoCard({ remito, rowId }: { remito: RemitoWithDocuments; rowId: string }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const [isEditingNumber, setIsEditingNumber] = React.useState(false);
  const [editedNumber, setEditedNumber] = React.useState(remito.remit_number);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const isLinked = remito.is_linked === true;

  const updateNumberMutation = useMutation({
    mutationFn: ({ id, number }: { id: string; number: string }) => updateRemitoNumber(id, number),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: remitoQueryKey(rowId) });
      toast.success(`Número actualizado a ${updated.remit_number}`);
      setIsEditingNumber(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el número');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: isLinked ? (id: string) => unlinkRemito(id) : (id: string) => deleteRemito(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remitoQueryKey(rowId) });
      toast.success(isLinked ? 'Remito desvinculado' : 'Remito eliminado');
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || (isLinked ? 'Error al desvincular' : 'Error al eliminar'));
    },
  });

  const handleSaveNumber = () => {
    const trimmed = editedNumber.trim();
    if (!trimmed || trimmed === remito.remit_number) {
      setIsEditingNumber(false);
      setEditedNumber(remito.remit_number);
      return;
    }
    updateNumberMutation.mutate({ id: remito.id, number: trimmed });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Colapsar' : 'Expandir'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Remit number — editable */}
        {isEditingNumber ? (
          <div className="flex items-center gap-1.5 flex-1">
            <Input
              value={editedNumber}
              onChange={(e) => setEditedNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNumber();
                if (e.key === 'Escape') {
                  setIsEditingNumber(false);
                  setEditedNumber(remito.remit_number);
                }
              }}
              className="h-7 text-sm"
              autoFocus
              disabled={updateNumberMutation.isPending}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={handleSaveNumber}
              disabled={updateNumberMutation.isPending}
            >
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => {
                setIsEditingNumber(false);
                setEditedNumber(remito.remit_number);
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            {isLinked ? (
              <Link2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="font-medium text-sm">{remito.remit_number}</span>
            {isLinked && (
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-500 h-5 px-1.5">
                Vinculado
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              <FileText className="h-3 w-3 mr-1" />
              {remito.remito_documents.length}
            </Badge>
            <button
              type="button"
              onClick={() => setIsEditingNumber(true)}
              className="text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Editar número"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Actions */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleteMutation.isPending}
          title={isLinked ? 'Desvincular' : 'Eliminar'}
        >
          {isLinked ? <Link2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Collapsible document list */}
      {expanded && (
        <div className="px-4 py-3 border-t bg-background">
          <DocumentList
            documents={remito.remito_documents}
            remitoId={remito.id}
            rowId={rowId}
            onDocumentDeleted={() => {}}
          />
        </div>
      )}

      {/* Delete/Unlink confirmation dialog */}
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
                    El remito y sus documentos originales permanecerán en el parte diario donde fue creado.
                  </span>
                </>
              ) : (
                <>
                  ¿Está seguro que desea eliminar el remito <strong>{remito.remit_number}</strong> y todos sus
                  documentos? Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(remito.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
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

// ---------------------------------------------------------------------------
// RemitosManagerDialog — root dialog
// ---------------------------------------------------------------------------
export function RemitosManagerDialog({
  open,
  onOpenChange,
  rowId,
  dailyReportId,
  onSuccess,
}: RemitosManagerDialogProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showLinkDialog, setShowLinkDialog] = React.useState(false);

  const { data: remitos = [], isLoading } = useQuery({
    queryKey: remitoQueryKey(rowId ?? ''),
    queryFn: () => getRemitosForRow(rowId!),
    enabled: open && !!rowId,
    staleTime: 5 * 60 * 1000,
  });

  const handleClose = () => {
    setShowAddDialog(false);
    setShowLinkDialog(false);
    onOpenChange(false);
  };

  const totalDocuments = remitos.reduce((acc, r) => acc + r.remito_documents.length, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="flex-shrink-0 px-6 py-5 border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Gestión de Remitos</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Administre los remitos y documentos de esta línea
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pr-6">
                <div className="px-3 py-2 bg-background rounded-lg border shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">Remitos</div>
                  <div className="text-xl font-bold text-primary">{remitos.length}</div>
                </div>
                <div className="px-3 py-2 bg-background rounded-lg border shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">Documentos</div>
                  <div className="text-xl font-bold text-green-600">{totalDocuments}</div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Action buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar remito
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                Vincular existente
              </Button>
            </div>

            {/* Remito list */}
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : remitos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No hay remitos registrados</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Agregue un remito para gestionar los documentos de esta línea.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {remitos.map((remito) => (
                  <RemitoCard key={remito.id} remito={remito} rowId={rowId!} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs rendered outside the main Dialog to avoid nesting issues */}
      {rowId && (
        <>
          <AddRemitDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            rowId={rowId}
            onSuccess={() => {
              setShowAddDialog(false);
              onSuccess();
            }}
          />

          <LinkRemitDialog
            open={showLinkDialog}
            onOpenChange={setShowLinkDialog}
            rowId={rowId}
            dailyReportId={dailyReportId}
            onSuccess={() => {
              setShowLinkDialog(false);
              onSuccess();
            }}
          />
        </>
      )}
    </>
  );
}
