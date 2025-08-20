'use client';

import { useState } from 'react';

interface UseVehicleFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<any>;
}

export function useVehicleForm({ initialData, onSubmit }: UseVehicleFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialData);

  const handleSubmit = async (data: any) => {
    setIsPending(true);
    try {
      await onSubmit(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return {
    isPending,
    isEditing,
    handleSubmit,
    handleEdit,
    handleCancel,
  };
}
