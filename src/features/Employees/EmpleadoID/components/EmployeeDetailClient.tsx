'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';
import { cn } from '@/lib/utils';
import { ArrowLeft, BarChart3, Briefcase, FileText, Lock, Pencil, Phone, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import type { EmployeeDetailData } from '../actions.server';
import { EmployeeFormWrapper } from './EmployeeFormWrapper';
import { EmployeeViewDisplay } from './EmployeeViewDisplay';
import { EmployeeQuickActions } from './employee-quick-actions';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeDetailClientProps {
  employee: EmployeeDetailData | null;
  employeeId: string;
  initialMode: 'view' | 'edit' | 'new';
  companyId: string;
  /** Server Component pre-renderizado con el header del empleado */
  header: React.ReactNode;
  /** Slot de documentos (Server Component pre-renderizado) */
  documentsSlot: React.ReactNode;
  /** Slot de diagramas envuelto en Suspense (Server Component pre-renderizado) */
  diagramsSlot: React.ReactNode;
}

type ActiveTab = 'personalData' | 'contactData' | 'workData';

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmployeeDetailClient({
  employee,
  employeeId,
  initialMode,
  companyId,
  header,
  documentsSlot,
  diagramsSlot,
}: EmployeeDetailClientProps) {
  const [currentMode, setCurrentMode] = useState<'view' | 'edit' | 'new'>(initialMode);
  const router = useRouter();
  const { canView } = usePermissions();

  // Verificar acceso a la tab de diagramas (alguna de sus subtabs)
  const hasDiagramAccess = canView('empleados', 'diagramas-empleado') || canView('empleados', 'new');

  // ─── Handlers de modo ──────────────────────────────────────────────────────
  const switchToEdit = () => {
    setCurrentMode('edit');
    window.history.replaceState(null, '', `?action=edit&employee_id=${employeeId}`);
  };

  const switchToView = () => {
    setCurrentMode('view');
    window.history.replaceState(null, '', `?action=view&employee_id=${employeeId}`);
  };

  const handleSaved = (newEmployeeId?: string) => {
    if (newEmployeeId) {
      // Nuevo empleado creado: full reload para cargar los datos del servidor
      window.location.href = `?action=view&employee_id=${newEmployeeId}`;
    } else {
      switchToView();
      // Refrescar datos del servidor sin perder el estado de la URL
      router.refresh();
    }
  };

  // ─── Construcción de tabs ─────────────────────────────────────────────────
  const isFormMode = currentMode === 'edit' || currentMode === 'new';

  const buildDataTabContent = (activeTab: ActiveTab) => {
    if (isFormMode) {
      return (
        <EmployeeFormWrapper
          employee={employee}
          mode={currentMode === 'new' ? 'new' : 'edit'}
          activeTab={activeTab}
          companyId={companyId}
          onSaved={handleSaved}
        />
      );
    }

    // Modo view: employee siempre está presente (modo new redirige al form)
    if (!employee) return null;

    return <EmployeeViewDisplay employee={employee} activeTab={activeTab} />;
  };

  const tabs = [
    {
      value: 'personalData',
      label: (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Datos Personales</span>
        </div>
      ),
      moduleSlug: 'empleados' as const,
      tabSlug: 'datos-personales' as const,
      content: buildDataTabContent('personalData'),
    },
    {
      value: 'contactData',
      label: (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">Datos de Contacto</span>
        </div>
      ),
      moduleSlug: 'empleados' as const,
      tabSlug: 'datos-contacto' as const,
      content: buildDataTabContent('contactData'),
    },
    {
      value: 'workData',
      label: (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Datos Laborales</span>
        </div>
      ),
      moduleSlug: 'empleados' as const,
      tabSlug: 'datos-laborales' as const,
      content: buildDataTabContent('workData'),
    },
    {
      value: 'documents',
      label: (
        <div className="flex items-center gap-2">
          {currentMode === 'new' ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          <span className="hidden sm:inline">Documentación</span>
        </div>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'documentos-de-empleados' as const,
      disabled: currentMode === 'new',
      content: documentsSlot,
    },
    // Tab de diagramas: solo si el usuario tiene acceso y no es modo new
    ...(hasDiagramAccess && currentMode !== 'new'
      ? [
          {
            value: 'diagrams',
            label: (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Diagramas</span>
              </div>
            ),
            // Sin moduleSlug/tabSlug: la visibilidad la controlan sus subtabs internas
            disabled: false,
            content: diagramsSlot,
          },
        ]
      : []),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header: pre-renderizado en el servidor */}
      {header}

      {/* Barra de acciones */}
      <div className={cn('flex items-center justify-between px-6 pb-4', !header && 'pt-4')}>
        {/* Botón volver */}
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </Button>

        {/* Acciones del empleado */}
        <div className="flex items-center gap-2">
          {/* Quick actions (solo en modo view con empleado existente) */}
          {currentMode === 'view' && employee && (
            <EmployeeQuickActions
              employeeId={employeeId}
              isActive={employee.is_active ?? true}
              email={employee.email ?? undefined}
            />
          )}

          {/* Botón Editar (solo en modo view) */}
          {currentMode === 'view' && (
            <PermissionGuard module="empleados" tab="employees" action="update">
              <Button size="sm" onClick={switchToEdit} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </PermissionGuard>
          )}

          {/* Botón Cancelar (solo en modo edit) */}
          {currentMode === 'edit' && (
            <Button variant="outline" size="sm" onClick={switchToView} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs principales */}
      <div className="px-6 pb-6">
        <TabsManagerClientSide<'empresa' | 'empleados' | 'documentacion'>
          paramName="tab"
          defaultTab="personalData"
          tabs={tabs}
          listClassName="grid w-full grid-cols-5"
          triggerClassName="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        />
      </div>
    </div>
  );
}
