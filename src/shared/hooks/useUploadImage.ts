'use client';
import { uploadToStorage } from '@/shared/actions/storage.server';
import { useState } from 'react';
import { useEdgeFunctions } from './useEdgeFunctions';

/**
 * Sube una imagen (logo de empresa, foto) al bucket indicado y devuelve su URL pública.
 * P3: storage — la subida corre en el servidor (`uploadToStorage`); P3 la lleva a MinIO.
 */
export const useImageUpload = () => {
  const [loading, setLoading] = useState(false);
  const { errorTranslate } = useEdgeFunctions();
  const url = process.env.NEXT_PUBLIC_PROJECT_URL;

  const uploadImage = async (file: File, imageBucket: string): Promise<string> => {
    try {
      setLoading(true);

      const fileName = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '');
      const result = await uploadToStorage(imageBucket, fileName, file, { upsert: true, cacheControl: '1' });

      if (!result.ok) {
        const message = await errorTranslate(result.error);
        throw new Error(String(message).replaceAll('"', ''));
      }

      // URL pública de la imagen cargada
      return `${url}/${imageBucket}/${result.path}`.trim().replace(/\s/g, '');
    } finally {
      setLoading(false);
    }
  };

  return { uploadImage, loading };
};
