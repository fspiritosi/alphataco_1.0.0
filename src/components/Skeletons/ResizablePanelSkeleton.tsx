'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { ReactNode } from 'react';

interface ResizablePanelSkeletonProps {
  /**
   * Dirección de los paneles (horizontal o vertical)
   */
  direction?: 'horizontal' | 'vertical';

  /**
   * Altura mínima del grupo de paneles
   */
  minHeight?: string;

  /**
   * Tamaño por defecto del panel izquierdo/superior (porcentaje del total)
   */
  leftPanelSize?: number;

  /**
   * Tamaño por defecto del panel derecho/inferior (porcentaje del total)
   */
  rightPanelSize?: number;

  /**
   * Contenido personalizado para el panel izquierdo/superior
   * Si no se proporciona, se mostrará un skeleton por defecto
   */
  leftPanelContent?: ReactNode;

  /**
   * Contenido personalizado para el panel derecho/inferior
   * Si no se proporciona, se mostrará un skeleton por defecto
   */
  rightPanelContent?: ReactNode;

  /**
   * Cantidad de filas de skeleton en el panel izquierdo
   */
  leftPanelRows?: number;

  /**
   * Cantidad de filas de skeleton en el panel derecho
   */
  rightPanelRows?: number;

  /**
   * Clases adicionales para el contenedor principal
   */
  className?: string;

  /**
   * Estado de carga, si es true muestra el skeleton, si es false muestra children
   */
  isLoading?: boolean;

  /**
   * Componentes hijos para renderizar cuando no está cargando
   */
  children?: ReactNode;
}

function TableRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex justify-between items-center mb-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-8 w-[120px]" />
      </div>

      <div className="grid grid-cols-6 gap-4 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-4 py-2 border-b">
          {Array.from({ length: 6 }).map((_, j) => (
            <Skeleton key={j} className="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <Skeleton className="h-8 w-[250px] mb-2" />

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      <div className="flex justify-end gap-2 mt-4">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
  );
}

/**
 * Componente que muestra un panel redimensionable con esqueletos de carga
 * o el contenido proporcionado por children cuando isLoading es false
 */
export default function ResizablePanelSkeleton({
  direction = 'horizontal',
  minHeight = '400px',
  leftPanelSize = 40,
  rightPanelSize = 60,
  leftPanelContent,
  rightPanelContent,
  leftPanelRows = 5,
  rightPanelRows = 10,
  className = '',
  isLoading = true,
  children,
}: ResizablePanelSkeletonProps) {
  // Si no está cargando y se proporcionaron hijos, mostrarlos
  if (!isLoading && children) {
    return <>{children}</>;
  }

  return (
    <div className={`w-full ${className}`}>
      <ResizablePanelGroup className={`min-h-[${minHeight}]`} direction={direction}>
        <ResizablePanel defaultSize={leftPanelSize}>
          {leftPanelContent || <FormSkeleton rows={leftPanelRows} />}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={rightPanelSize}>
          {rightPanelContent || <TableRowSkeleton rows={rightPanelRows} />}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Variantes pre-configuradas para casos de uso comunes
export function FormTableResizableSkeleton({
  formRows = 5,
  tableRows = 10,
  ...rest
}: Omit<ResizablePanelSkeletonProps, 'leftPanelContent' | 'rightPanelContent' | 'leftPanelRows' | 'rightPanelRows'> & {
  formRows?: number;
  tableRows?: number;
}) {
  return (
    <ResizablePanelSkeleton
      leftPanelContent={<FormSkeleton rows={formRows} />}
      rightPanelContent={<TableRowSkeleton rows={tableRows} />}
      {...rest}
    />
  );
}

export function TableFormResizableSkeleton({
  formRows = 5,
  tableRows = 10,
  ...rest
}: Omit<ResizablePanelSkeletonProps, 'leftPanelContent' | 'rightPanelContent' | 'leftPanelRows' | 'rightPanelRows'> & {
  formRows?: number;
  tableRows?: number;
}) {
  return (
    <ResizablePanelSkeleton
      leftPanelContent={<TableRowSkeleton rows={tableRows} />}
      rightPanelContent={<FormSkeleton rows={formRows} />}
      leftPanelSize={60}
      rightPanelSize={40}
      {...rest}
    />
  );
}

export function DualTableResizableSkeleton({
  leftRows = 10,
  rightRows = 10,
  ...rest
}: Omit<ResizablePanelSkeletonProps, 'leftPanelContent' | 'rightPanelContent' | 'leftPanelRows' | 'rightPanelRows'> & {
  leftRows?: number;
  rightRows?: number;
}) {
  return (
    <ResizablePanelSkeleton
      leftPanelContent={<TableRowSkeleton rows={leftRows} />}
      rightPanelContent={<TableRowSkeleton rows={rightRows} />}
      {...rest}
    />
  );
}
