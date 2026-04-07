'use client';

import { ActionButton } from '@/features/Mantenimiento/shared/components/action-button';
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DeliveryWizard } from './DeliveryWizard';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'menu' | 'list' | 'new';

interface DeliveryPageClientProps {
  initialEmployeeId?: string;
  listSlot: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeliveryPageClient({ initialEmployeeId, listSlot }: DeliveryPageClientProps) {
  const [view, setView] = useState<ViewMode>(initialEmployeeId ? 'new' : 'menu');

  const handleBack = useCallback(() => setView('menu'), []);

  // ── Menu: choose action ───────────────────────────────────────────────────
  if (view === 'menu') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Indumentaria</h1>
          <p className="text-sm text-muted-foreground">Seleccione una opción para continuar.</p>
        </div>

        <div className="space-y-3">
          <ActionButton
            icon={Plus}
            label="Nueva Entrega"
            description="Registrar una nueva entrega de indumentaria o EPP"
            variant="default"
            onClick={() => setView('new')}
          />
          <ActionButton
            icon={ClipboardList}
            label="Ver Entregas"
            description="Consultar el historial completo de entregas"
            onClick={() => setView('list')}
          />
        </div>
      </div>
    );
  }

  // ── List: all deliveries ──────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <ActionButton icon={ArrowLeft} label="Volver al menú" variant="ghost" onClick={handleBack} className="w-auto" />
        {listSlot}
      </div>
    );
  }

  // ── New: delivery wizard ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <ActionButton icon={ArrowLeft} label="Volver al menú" variant="ghost" onClick={handleBack} className="w-auto" />
      <DeliveryWizard initialEmployeeId={initialEmployeeId} onComplete={() => setView('list')} />
    </div>
  );
}
