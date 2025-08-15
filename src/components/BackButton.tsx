'use client';
import { useEditButton } from '@/store/editState';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

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
