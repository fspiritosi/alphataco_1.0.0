'use client';
import { uploadToStorage } from '@/shared/actions/storage.server';
import { useState } from 'react';
import { useEdgeFunctions } from './useEdgeFunctions';

/**
 * Sube una imagen (avatar, imagen del preparte) y devuelve la URL con la que se muestra y
 * se guarda en la base.
 *
 * La URL la arma el servidor (`uploadToStorage`), no el cliente: la carpeta es la de la
 * empresa activa y el cliente no la conoce. Antes se construía acá con
 * `NEXT_PUBLIC_PROJECT_URL`, que apuntaba al dominio de la app y nunca al storage.
 */
export const useImageUpload = () => {
  const [loading, setLoading] = useState(false);
  const { errorTranslate } = useEdgeFunctions();

  const uploadImage = async (file: File, imageBucket: string): Promise<string> => {
    try {
      setLoading(true);

      const result = await uploadToStorage(imageBucket, file.name, file, { upsert: true, cacheControl: '1' });

      if (!result.ok) {
        const message = await errorTranslate(result.error);
        throw new Error(String(message).replaceAll('"', ''));
      }

      return result.url;
    } finally {
      setLoading(false);
    }
  };

  return { uploadImage, loading };
};
