interface DiagramLoadSummaryProps {
  /** Empleado de la carga, con legajo. */
  employeeLabel?: string;
  /** Tipo de novedad que se va a aplicar. */
  diagramTypeLabel?: string;
}

/**
 * Datos que serian identicos en todas las filas (la carga siempre es de UN empleado y UNA
 * novedad): se muestran una sola vez arriba de los resultados en lugar de repetirse como
 * columna en cada fila. Asi las tablas se quedan solo con lo que cambia dia a dia y las
 * acciones entran sin scroll horizontal.
 */
export function DiagramLoadSummary({ employeeLabel, diagramTypeLabel }: DiagramLoadSummaryProps) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <dt className="text-muted-foreground shrink-0">Empleado:</dt>
        <dd className="truncate font-medium">{employeeLabel || 'Sin seleccionar'}</dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <dt className="text-muted-foreground shrink-0">Novedad a aplicar:</dt>
        <dd className="truncate font-medium">{diagramTypeLabel || 'Sin seleccionar'}</dd>
      </div>
    </dl>
  );
}
