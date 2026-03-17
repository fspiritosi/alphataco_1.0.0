'use client';
import { Button } from '@/components/ui/button';
import { useEditButton } from '@/shared/store/editState';
import { useRouter } from 'next/navigation';

function BackButton({ size }: { size?: any }) {
  const router = useRouter();
  const desabilitarEdicion = useEditButton((state: any) => state.setReadOnly);

  const handleBack = () => {
    desabilitarEdicion();
    router.back();
  };

  return (
    <Button variant={'outline'} size={size} onClick={() => handleBack()}>
      Volver
    </Button>
  );
}

export default BackButton;
