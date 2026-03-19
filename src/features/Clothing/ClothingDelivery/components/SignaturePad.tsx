'use client';

import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { Eraser, Pen } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type SignaturePadLib from 'signature_pad';

const logger = new Logger('Clothing/SignaturePad');

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<InstanceType<typeof SignaturePadLib> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Resize canvas to match container size while keeping content
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // SignaturePad must be re-initialized or cleared after resize
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsEmpty(true);
    }
  }, []);

  // Dynamically load signature_pad (client-only library)
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    async function init() {
      try {
        const { default: SignaturePadLib } = await import('signature_pad');
        const canvas = canvasRef.current;
        if (!canvas) return;

        resizeCanvas();

        const sp = new SignaturePadLib(canvas, {
          minWidth: 1,
          maxWidth: 2.5,
          penColor: '#111827',
          backgroundColor: 'rgba(0,0,0,0)',
        });

        sp.addEventListener('beginStroke', () => {
          setIsEmpty(false);
        });

        signaturePadRef.current = sp;
        setIsLoaded(true);

        // Observe container size changes
        if (containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            resizeCanvas();
          });
          resizeObserver.observe(containerRef.current);
        }
      } catch (err) {
        logger.error('Error loading SignaturePad library', { data: { err } });
      }
    }

    init();

    return () => {
      resizeObserver?.disconnect();
    };
  }, [resizeCanvas]);

  const handleClear = useCallback(() => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
    onClear();
  }, [onClear]);

  const handleSave = useCallback(() => {
    const sp = signaturePadRef.current;
    if (!sp || sp.isEmpty()) return;
    const dataUrl = sp.toDataURL('image/png');
    logger.debug('Signature captured');
    onSave(dataUrl);
  }, [onSave]);

  return (
    <div className="space-y-3">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white dark:bg-neutral-950 overflow-hidden"
        style={{ height: 200 }}
      >
        <canvas ref={canvasRef} className="touch-none cursor-crosshair w-full h-full" style={{ touchAction: 'none' }} />
        {/* Placeholder when empty */}
        {isEmpty && isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
            <Pen className="h-6 w-6 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground/50">Firme aqui con su dedo o lapiz</span>
          </div>
        )}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Cargando panel de firma...</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={!isLoaded} className="gap-2">
          <Eraser className="h-4 w-4" />
          Limpiar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!isLoaded || isEmpty} className="gap-2 flex-1">
          <Pen className="h-4 w-4" />
          Confirmar Firma
        </Button>
      </div>
    </div>
  );
}
