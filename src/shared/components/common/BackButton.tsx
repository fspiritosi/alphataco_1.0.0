'use client';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';
import { useEditButton } from '@/shared/store/editState';
import { useRouter } from 'next/navigation';

function BackButton({ size }: { size?: ComponentProps<typeof Button>['size'] }) {
  const router = useRouter();
  const desabilitarEdicion = useEditButton((state) => state.setReadOnly);

  const handleBack = () => {
    // `setReadOnly(readonly)` guarda `!readonly`: con `false` la vista queda en solo lectura.
    desabilitarEdicion(false);
    router.back();
  };

  return (
    <Button variant={'outline'} size={size} onClick={() => handleBack()}>
      Volver
    </Button>
  );
}

export default BackButton;
