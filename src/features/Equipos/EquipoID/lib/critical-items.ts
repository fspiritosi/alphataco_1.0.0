/**
 * `checklist_answers.critical_items_failed` es `text[]` en la base, pero cada elemento
 * puede ser un JSON (`{ item_code, item_label }`) o un texto plano, y en filas viejas la
 * columna entera llegó como un único JSON. Este módulo puro normaliza cualquiera de esas
 * formas a la lista de etiquetas a mostrar.
 */

function labelOf(item: unknown): string {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return labelOf(JSON.parse(trimmed));
      } catch {
        return item;
      }
    }
    return item;
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    if (typeof record.item_label === 'string' && record.item_label) return record.item_label;
    if (typeof record.item_code === 'string' && record.item_code) return record.item_code;
    return JSON.stringify(item);
  }
  return String(item);
}

export function parseCriticalItemLabels(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        return parseCriticalItemLabels(JSON.parse(trimmed));
      } catch {
        return [value];
      }
    }
    return [labelOf(value)];
  }
  if (Array.isArray(value)) return value.map(labelOf);
  return [labelOf(value)];
}

/** Resumen corto para la celda: dos etiquetas y "..." si hay más. */
export function summarizeCriticalItems(labels: readonly string[]): string {
  return labels.slice(0, 2).join(', ') + (labels.length > 2 ? '...' : '');
}
