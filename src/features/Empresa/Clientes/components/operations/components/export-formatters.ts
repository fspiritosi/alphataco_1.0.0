/**
 * Funciones de formateo para exportación de datos a Excel
 * Estas funciones manejan la conversión de datos complejos (arrays, objetos, JSON strings)
 * a formatos legibles para Excel
 */

/**
 * Formatea un array de empleados para exportación
 * Maneja tanto arrays normales como strings JSON
 */
export function formatEmployeesForExport(value: any): string {
  try {
    // Si es un string JSON, parsearlo
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.join(', ') : '-';
      }
      return parsed || '-';
    }

    // Si ya es un array
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '-';
    }

    return value || '-';
  } catch (error) {
    console.error('Error formateando empleados:', error);
    return '-';
  }
}

/**
 * Formatea un array de equipos para exportación
 * Maneja tanto arrays normales como strings JSON
 */
export function formatEquipmentForExport(value: any): string {
  try {
    // Si es un string JSON, parsearlo
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.join(', ') : '-';
      }
      return parsed || '-';
    }

    // Si ya es un array
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '-';
    }

    return value || '-';
  } catch (error) {
    console.error('Error formateando equipos:', error);
    return '-';
  }
}

/**
 * Formatea equipos del cliente para exportación
 * Extrae solo los nombres de los objetos
 */
export function formatCustomerEquipmentForExport(value: any): string {
  try {
    // Si es un string JSON, parsearlo
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const names = parsed.map((eq: any) => eq.name || eq).filter(Boolean);
        return names.length > 0 ? names.join(', ') : '-';
      }
      return parsed || '-';
    }

    // Si ya es un array de objetos
    if (Array.isArray(value)) {
      const names = value.map((eq: any) => eq.name || eq).filter(Boolean);
      return names.length > 0 ? names.join(', ') : '-';
    }

    return value || '-';
  } catch (error) {
    console.error('Error formateando equipos del cliente:', error);
    return '-';
  }
}

/**
 * Formatea fechas para exportación
 */
export function formatDateForExport(value: any): string {
  if (!value) return '-';

  try {
    const date = new Date(value);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return value || '-';
  }
}

/**
 * Formatea estados para exportación (traduce los valores)
 */
export function formatStatusForExport(value: any): string {
  const statusMap: Record<string, string> = {
    pendiente: 'Pendiente',
    sin_recursos_asignados: 'Sin recursos asignados',
    ejecutado: 'Ejecutado',
    reprogramado: 'Reprogramado',
    cancelado: 'Cancelado',
    en_certificacion: 'En certificación',
  };

  return statusMap[value] || value || '-';
}

/**
 * Formatea valores genéricos para exportación
 */
export function formatGenericValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // Si es un array
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '-';
  }

  // Si es un objeto
  if (typeof value === 'object') {
    // Intentar extraer la propiedad 'name'
    if (value.name) {
      return value.name;
    }
    // Si no, convertir a JSON
    return JSON.stringify(value);
  }

  return String(value);
}
