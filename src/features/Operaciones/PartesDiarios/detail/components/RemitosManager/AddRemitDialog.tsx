'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { createRemito, uploadRemitoDocument } from './actions.server';

const logger = new Logger('AddRemitDialog');

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface AddRemitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string;
  onSuccess: () => void;
}

export function AddRemitDialog({ open, onOpenChange, rowId, onSuccess }: AddRemitDialogProps) {
  const queryClient = useQueryClient();

  const [remitNumber, setRemitNumber] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState('');
  const [formError, setFormError] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!remitNumber.trim()) throw new Error('El número de remito es requerido');

      // 1. Create the remito DB record via server action
      const remito = await createRemito(rowId, remitNumber.trim());

      // 2. Upload files client-side to Supabase Storage
      if (selectedFiles.length > 0) {
        const supabase = supabaseBrowser();

        for (const file of selectedFiles) {
          try {
            const ext = file.name.split('.').pop();
            const timestamp = Date.now();
            const fileName = `remito-${remito.remit_number}-${timestamp}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
            const storagePath = `remitos/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('daily-reports')
              .upload(storagePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) {
              logger.warn('Error al subir archivo, se omite', { data: { uploadError, fileName } });
              toast.warning(`No se pudo subir "${file.name}"`);
              continue;
            }

            // 3. Register document record in DB via server action
            await uploadRemitoDocument(remito.id, uploadData.path, file.name);
          } catch (err) {
            logger.warn('Error al procesar archivo', { data: { err, fileName: file.name } });
            toast.warning(`No se pudo procesar "${file.name}"`);
          }
        }
      }

      return remito;
    },
    onSuccess: (remito) => {
      queryClient.invalidateQueries({ queryKey: ['remitos', rowId] });
      toast.success(`Remito ${remito.remit_number} creado`);
      handleClose();
      onSuccess();
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Error al crear el remito');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setFileError('');

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" supera el límite de 10MB`);
        continue;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" no es un tipo de archivo permitido (PDF, JPG, PNG, WebP)`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      setFileError(errors.join(' · '));
    }

    setSelectedFiles((prev) => {
      // Avoid duplicates by name
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...validFiles.filter((f) => !existingNames.has(f.name))];
    });

    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setRemitNumber('');
    setSelectedFiles([]);
    setFileError('');
    setFormError('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!remitNumber.trim()) {
      setFormError('El número de remito es requerido');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Agregar Nuevo Remito</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Complete los datos para crear un nuevo remito</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Remit number */}
          <div className="space-y-2">
            <Label htmlFor="remitNumber" className="text-sm font-semibold">
              Número de Remito <span className="text-destructive">*</span>
            </Label>
            <Input
              id="remitNumber"
              value={remitNumber}
              onChange={(e) => {
                setRemitNumber(e.target.value);
                setFormError('');
              }}
              placeholder="Ej: 12345 o ABC-001"
              autoFocus
              disabled={createMutation.isPending}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Ingrese un número único que identifique este remito</p>
          </div>

          {/* File upload area */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Documentos <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>

            <div
              role="button"
              tabIndex={0}
              onClick={() => !createMutation.isPending && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !createMutation.isPending) {
                  fileInputRef.current?.click();
                }
              }}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Haga clic para seleccionar archivos</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP — máx. 10MB por archivo</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
                disabled={createMutation.isPending}
              />
            </div>

            {fileError && <p className="text-xs text-destructive">{fileError}</p>}

            {selectedFiles.length > 0 && (
              <ul className="space-y-1.5 mt-2">
                {selectedFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate text-xs">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      disabled={createMutation.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Error */}
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !remitNumber.trim()}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Remito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
