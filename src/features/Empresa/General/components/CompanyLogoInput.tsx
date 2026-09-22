'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ChangeEvent, useRef, useState } from 'react';

interface CompanyLogoInputProps {
  onFileChange: (file: File | null) => void;
}

const ACCEPT = '.jpg, .jpeg, .png, .gif, .bmp, .tif, .tiff, .webp';

/** Selector de logo con vista previa (alta y edición de empresa). El archivo viaja en el FormData como `logo`. */
export function CompanyLogoInput({ onFileChange }: CompanyLogoInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onFileChange(file);
    if (!file) {
      setPreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-[300px] mt-8">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="logo">
          Subir Logo <span className="opacity-70">(10MB máximo)</span>
        </Label>
        <Input
          readOnly
          type="text"
          onClick={() => fileInputRef.current?.click()}
          className="self-center cursor-pointer"
          placeholder="Seleccionar foto o subir foto"
        />
        <Input
          ref={fileInputRef}
          type="file"
          name="logo"
          id="logo"
          accept={ACCEPT}
          onChange={handleImageChange}
          className="self-center hidden"
        />
      </div>
      <div className="flex items-center gap-2 justify-around rounded-xl">
        {preview && (
          <img
            src={preview}
            className="rounded-xl my-1 max-w-[150px] max-h-[120px] p-2 bg-slate-200"
            alt="Vista previa del logo"
          />
        )}
      </div>
    </div>
  );
}
