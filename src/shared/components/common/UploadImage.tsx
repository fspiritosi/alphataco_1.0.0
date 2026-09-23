'use client';
import { Button } from '@/components/ui/button';
import { FormDescription, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { handleSupabaseError } from '@/lib/errorHandler';
import { useImageUpload } from '@/shared/hooks/useUploadImage';
import React, { ChangeEvent, useState } from 'react';
import { toast } from 'sonner';
require('dotenv').config();
interface UploadImageProps {
  onImageChange: (imageUrl: string) => void;
  // onUploadSuccess?: (imageUrl: string) => void
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  label?: string;
  desciption?: string;
  labelInput?: string;
  imageBucket: string;
  /** Field de react-hook-form (sólo se usa como flag; el input maneja el archivo por su cuenta). */
  field?: { onChange?: (event: ChangeEvent<HTMLInputElement>) => void };
  setAvailableToSubmit?: (value: boolean) => void;
  disabledInput?: boolean;
}

export function UploadImage({
  onImageChange,
  disabledInput,
  style,
  inputStyle,
  desciption,
  labelInput,
  imageBucket,
  setAvailableToSubmit,
  field,
}: UploadImageProps) {
  const { uploadImage, loading } = useImageUpload();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setImageFile(file);

      // Convertir la imagen a base64
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setBase64Image(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (imageFile) {
      try {
        // La key y la URL las decide el servidor (la identidad del archivo sale de la
        // sesión, no de una prop). El `?timestamp` sólo rompe la caché del navegador,
        // porque la imagen anterior se pisa en la misma key.
        const uploadedImageUrl = await uploadImage(imageFile, imageBucket);
        onImageChange(`${uploadedImageUrl}?timestamp=${Date.now()}`);

        if (setAvailableToSubmit) setAvailableToSubmit(true);
        setDisabled(true);
      } catch (error) {
        toast.error(`${handleSupabaseError(error instanceof Error ? error.message : String(error))}`);
      }
    }
  };

  return (
    <>
      <div className="flex flex-col  space-y-2">
        <FormLabel>{labelInput}</FormLabel>
        <Input
          type="file"
          disabled={disabledInput}
          accept="image/*"
          // {...field}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (field) {
              // field?.onChange(event) // Mantén el funcionamiento del {...field}
              handleImageChange(event); // Accede al archivo file del input
            } else {
              handleImageChange(event); // Accede al archivo file del input
            }
          }}
          className="self-center"
          id="fileInput"
          style={{ ...inputStyle }}
        />
        {desciption && <FormDescription className="max-w-[300px] p-0 m-0">{desciption}</FormDescription>}
      </div>

      <div className="flex items-center gap-2 justify-around  rounded-xl">
        {base64Image && (
          <img
            src={base64Image}
            // style={{ ...style }}
            className="rounded-xl my-1 max-w-[150px] max-h-[120px] p-2 bg-slate-200"
            alt="Vista previa de la imagen"
          />
        )}

        {loading}
        {imageFile && (
          <Button onClick={handleUpload} disabled={loading || disabled}>
            {disabled ? 'Imagen subida' : 'Subir imagen'}
          </Button>
        )}
      </div>
    </>
  );
}
