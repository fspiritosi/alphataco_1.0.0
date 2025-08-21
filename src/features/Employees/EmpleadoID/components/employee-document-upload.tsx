'use client';

import type React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { fetchDocumentTypes, uploadEmployeeDocument } from '../lib/actions/document-actions';

const documentUploadSchema = z.object({
  document_name: z.string().min(1, 'El nombre del documento es requerido'),
  document_type_id: z.string().min(1, 'El tipo de documento es requerido'),
  expiration_date: z.date().optional(),
  is_required: z.boolean().default(false),
  file: z.instanceof(File).refine((file) => file.size > 0, 'Debe seleccionar un archivo'),
});

type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

interface EmployeeDocumentUploadProps {
  employeeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeDocumentUpload({ employeeId, onClose, onSuccess }: EmployeeDocumentUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [documentTypes, setDocumentTypes] = useState<any>([]);
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      document_name: '',
      document_type_id: '',
      expiration_date: undefined,
      is_required: false,
    },
  });

  // Load document types on mount
  useState(() => {
    fetchDocumentTypes().then(setDocumentTypes);
  });

  const handleFileSelect = (file: File) => {
    form.setValue('file', file);
    if (!form.getValues('document_name')) {
      form.setValue('document_name', file.name.split('.')[0]);
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = (data: DocumentUploadFormData) => {
    startTransition(async () => {
      try {
        // First upload the file to storage
        const formData = new FormData();
        formData.append('file', data.file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir el archivo');
        }

        const { url } = await uploadResponse.json();

        // Then save the document record
        await uploadEmployeeDocument(employeeId, {
          document_name: data.document_name,
          document_url: url,
          document_type_id: data.document_type_id,
          expiration_date: data.expiration_date?.toISOString().split('T')[0],
          is_required: data.is_required,
        });

        toast.success('Documento subido correctamente');
        onSuccess();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al subir el documento');
      }
    });
  };

  const selectedFile = form.watch('file');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>Selecciona un archivo y completa la información del documento.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* File Upload Area */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                selectedFile ? 'border-green-500 bg-green-50' : ''
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('file', undefined as any)}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Arrastra un archivo aquí o</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      Seleccionar archivo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG (máx. 10MB)</p>
                </div>
              )}

              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {/* Document Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="document_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Documento *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Certificado médico" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Vencimiento (Opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Documento requerido</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Marcar si este documento es obligatorio para el empleado
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !selectedFile}>
                <Upload className="h-4 w-4 mr-2" />
                {isPending ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
