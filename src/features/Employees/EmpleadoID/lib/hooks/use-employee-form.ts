'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface UseEmployeeFormProps<T, R = unknown> {
  initialData?: T;
  onSubmit: (data: T) => Promise<R>;
  onSuccess?: (data: R) => void;
  onError?: (error: Error) => void;
}

export function useEmployeeForm<T, R = unknown>({
  initialData,
  onSubmit,
  onSuccess,
  onError,
}: UseEmployeeFormProps<T, R>) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (data: T) => {
    startTransition(async () => {
      try {
        const result = await onSubmit(data);
        toast.success('Información actualizada correctamente');
        setIsEditing(false);
        onSuccess?.(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast.error(`Error al actualizar: ${errorMessage}`);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    });
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => setIsEditing(false);

  return {
    isPending,
    isEditing,
    handleSubmit,
    handleEdit,
    handleCancel,
  };
}
