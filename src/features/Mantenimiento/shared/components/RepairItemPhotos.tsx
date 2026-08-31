'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useState } from 'react';

/**
 * Fotos de un item de reparacion (ticket 592).
 *
 * Las carga el supervisor al crear el pedido y son el contexto que el taller
 * necesita para dimensionar el trabajo, asi que se muestran en TODO el circuito:
 * detalle del pedido, planificacion, entrada a taller, items solicitados y el
 * wizard de generacion de OTs.
 *
 * Las URLs ya vienen publicas desde el bucket `repair-images`; el click abre la
 * foto en grande porque la miniatura no alcanza para ver una perdida de aceite
 * o una rajadura.
 */
type RepairItemPhotosProps = {
  images: string[] | null | undefined;
  /** Texto del item, para el alt y el titulo del visor */
  label?: string | null;
  /** Miniaturas mas chicas para listas densas */
  size?: 'sm' | 'md';
  className?: string;
};

export function RepairItemPhotos({ images, label, size = 'md', className }: RepairItemPhotosProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const box = size === 'sm' ? 'h-12 w-12' : 'h-16 w-16';
  const itemLabel = label?.trim() || 'la reparación';

  return (
    <>
      <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
        {images.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={`Ampliar foto ${index + 1} de ${images.length} de ${itemLabel}`}
            className={`relative ${box} shrink-0 overflow-hidden rounded-md border transition hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none`}
          >
            <Image src={url} alt={`Foto ${index + 1} de ${itemLabel}`} fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">Foto de la reparación</DialogTitle>
            <DialogDescription className="sr-only">
              Vista ampliada de la foto adjunta al item de reparación
            </DialogDescription>
          </DialogHeader>
          {openIndex !== null && (
            <div className="space-y-2">
              {label?.trim() && <p className="text-sm font-medium">{label}</p>}
              <div className="relative h-[70vh] w-full overflow-hidden rounded-md border bg-muted">
                <Image
                  src={images[openIndex]}
                  alt={`Foto ${openIndex + 1} de ${itemLabel}`}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              {images.length > 1 && (
                <p className="text-center text-xs text-muted-foreground">
                  Foto {openIndex + 1} de {images.length}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
