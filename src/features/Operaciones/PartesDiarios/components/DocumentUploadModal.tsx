'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, FileIcon, FileText, ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { DailyReportRow } from './DayliReportDetailTable';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface DocumentUploadModalProps {
  documentData: DailyReportRow;
}
// Add these imports at the top

// Define the form schema

export default function DocumentUploadModal({ documentData }: DocumentUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = supabaseBrowser();
  const [remitNumber, setRemitNumber] = useState(documentData.remit_number || '');

  const router = useRouter();

  const handleOpenModal = () => {
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFile(selectedFile);
  };

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);

    // Crear vista previa para imágenes
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .replace(/--+/g, '-') // Reemplazar múltiples guiones con uno solo
      .replace(/^-+|-+$/g, ''); // Eliminar guiones al principio y final
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    if (!file) throw new Error('No se ha seleccionado ningún archivo');

    const fileExtension = file.name.split('.').pop();
    const fileName = `remito-${documentData.remit_number}.${fileExtension}`;
    const formattedCustomer = formatFileName(documentData.customer!);
    const filePath = `${formattedCustomer}/${fileName}`;

    const { data, error } = await supabase.storage.from('daily-reports').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      console.error('Error al subir el archivo:', error);
      throw new Error('Error al subir el archivo');
    }

    // Obtener la URL pública del archivo
    const {
      data: { publicUrl },
    } = supabase.storage.from('daily-reports').getPublicUrl(filePath);

    return publicUrl;
  };

  const updateDocumentPath = async (documentUrl: string): Promise<void> => {
    const { error } = await supabase
      .from('dailyreportrows')
      .update({ document_path: documentUrl })
      .eq('id', documentData.id);

    if (error) {
      console.error('Error al actualizar la ruta del documento:', error);
      throw new Error('Error al actualizar el registro');
    }
  };

  const updateRemitNumber = async (remit_number: string): Promise<void> => {
    const { error } = await supabase.from('dailyreportrows').update({ remit_number }).eq('id', documentData.id);

    if (error) {
      console.error('Error al actualizar el número de remito:', error);
      throw new Error('Error al actualizar el registro');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast.error('Por favor seleccione un archivo');
      return;
    }
    try {
      setUploadStatus('uploading');

      toast.promise(
        (async () => {
          // 1. Subir el archivo a Supabase Storage
          const documentUrl = await uploadFileToStorage(file);

          // 2. Actualizar el registro en la base de datos
          await updateDocumentPath(documentUrl);
          if (!documentData.remit_number) {
            await updateRemitNumber(remitNumber);
          }

          // 3. Actualizar el estado local
          setUploadStatus('success');
          setProgress(100);

          // 4. Cerrar el modal después de 2 segundos
          setTimeout(() => {
            setOpen(false);
            router.refresh();
          }, 1000);

          return documentUrl;
        })(),
        {
          loading: 'Subiendo documento...',
          success: (documentUrl) => {
            return 'Documento subido correctamente';
          },
          error: (error) => {
            console.error('Error:', error);
            setUploadStatus('error');
            return error.message || 'Error al subir el documento';
          },
        }
      );
    } catch (error) {
      console.error('Error en el proceso de subida:', error);
      setUploadStatus('error');
      toast.error(error instanceof Error ? error.message : 'Error al subir el documento');
    }
    router.refresh();
  };

  const getFileIcon = () => {
    if (!file) return null;

    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Progress value={progress} className="w-full h-2" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Button onClick={handleOpenModal} className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        Subir Documento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Subir nuevo documento</DialogTitle>
            <DialogDescription>Selecciona un archivo para subir al sistema.</DialogDescription>
            <div className="flex flex-col gap-2">
              <DialogDescription>Remito: </DialogDescription>
              <Input
                placeholder="Numero de remito"
                defaultValue={remitNumber || ''}
                onChange={(e) => setRemitNumber(e.target.value)}
                value={remitNumber || ''}
                readOnly={documentData.remit_number ? true : false}
                disabled={documentData.remit_number ? true : false}
              />
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Área de carga de archivos */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 transition-colors',
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                file ? 'bg-muted/50' : 'bg-transparent'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                {!file ? (
                  <>
                    <div className="rounded-full bg-primary/10 p-4">
                      <Upload className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        <span className="text-primary">Haz clic para buscar</span> o arrastra y suelta
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Soporta PDF, JPG, PNG (máx. 10MB)</p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Seleccionar archivo
                    </Button>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon()}
                        <div>
                          <p className="text-sm font-medium truncate max-w-[250px]">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        disabled={uploadStatus === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {preview && (
                      <div className="mt-2 flex justify-center">
                        <div className="relative h-40 w-40 overflow-hidden rounded border">
                          <Image
                            src={preview || '/placeholder.svg'}
                            alt="Vista previa"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-2">
                      {getStatusIcon()}
                      {uploadStatus === 'uploading' && (
                        <span className="text-xs text-muted-foreground">Subiendo... {progress}%</span>
                      )}
                      {uploadStatus === 'success' && (
                        <span className="text-xs text-green-600">Subido correctamente</span>
                      )}
                      {uploadStatus === 'error' && (
                        <span className="text-xs text-red-600">Error al subir el archivo</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploadStatus === 'uploading'}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'success' || !remitNumber}
              >
                {uploadStatus === 'uploading' ? 'Subiendo...' : 'Subir documento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
