'use client';

import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileDown, Loader2, Package, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { downloadDeliveriesAsZip, type BulkDownloadProgress } from './bulkDownload';

interface BulkDownloadBarProps {
  selectedIds: string[];
  onClear: () => void;
}

const STAGE_LABEL: Record<BulkDownloadProgress['stage'], string> = {
  fetching: 'Obteniendo datos…',
  rendering: 'Generando PDFs',
  zipping: 'Comprimiendo ZIP…',
  done: 'Listo',
};

export function BulkDownloadBar({ selectedIds, onClear }: BulkDownloadBarProps) {
  const logger = useState(() => new Logger('BulkDownloadBar'))[0];
  const [progress, setProgress] = useState<BulkDownloadProgress | null>(null);
  const [justFinished, setJustFinished] = useState(false);
  const isWorking = progress !== null && progress.stage !== 'done';
  const count = selectedIds.length;

  const handleDownload = useCallback(async () => {
    if (selectedIds.length === 0 || isWorking) return;

    setJustFinished(false);
    setProgress({ done: 0, total: selectedIds.length, stage: 'fetching' });

    try {
      await downloadDeliveriesAsZip(selectedIds, setProgress);
      setJustFinished(true);
      toast.success(`ZIP descargado con ${selectedIds.length} constancia${selectedIds.length !== 1 ? 's' : ''}`);
      // Brief "done" state, then clear selection and bar.
      setTimeout(() => {
        setProgress(null);
        setJustFinished(false);
        onClear();
      }, 1200);
    } catch (error) {
      logger.error('Bulk download failed', { data: { error } });
      toast.error('Error al generar el ZIP de constancias');
      setProgress(null);
    }
  }, [selectedIds, isWorking, onClear, logger]);

  // If selection drops to zero, also reset any lingering progress state.
  useEffect(() => {
    if (count === 0 && !isWorking) {
      setProgress(null);
      setJustFinished(false);
    }
  }, [count, isWorking]);

  const visible = count > 0;
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round(((progress.done + (progress.stage === 'zipping' ? 0.5 : 0)) / progress.total) * 100))
      : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="bulk-download-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <div
              role="region"
              aria-label="Descarga masiva de constancias"
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border/60 bg-background/85 px-4 py-3 shadow-2xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-xl min-w-[360px] max-w-[640px]"
            >
              {/* Top progress strip (only while working) */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden"
                aria-hidden="true"
              >
                {isWorking && (
                  <div
                    className="h-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                )}
                {justFinished && <div className="h-full w-full bg-emerald-500" />}
              </div>

            <div className="flex items-center gap-3">
              {/* Counter chip */}
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <Package className="h-3.5 w-3.5" />
                <span>
                  <span className="tabular-nums">{count}</span>{' '}
                  {count === 1 ? 'entrega' : 'entregas'}
                </span>
              </div>

              {/* Status / progress text (only while working or just finished) */}
              {(isWorking || justFinished) && progress && (
                <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
                  {justFinished ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  )}
                  <span className="truncate">
                    {justFinished
                      ? 'ZIP descargado'
                      : progress.stage === 'rendering'
                        ? `${STAGE_LABEL.rendering} (${progress.done}/${progress.total})`
                        : STAGE_LABEL[progress.stage]}
                  </span>
                </div>
              )}

              {/* Spacer when idle */}
              {!isWorking && !justFinished && <div className="flex-1" />}

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={isWorking || justFinished}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Descargar ZIP</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={onClear}
                  disabled={isWorking}
                  aria-label="Limpiar selección"
                  title="Limpiar selección"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
