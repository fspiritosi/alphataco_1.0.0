'use client';

import type { ReactNode } from 'react';

/**
 * Búsqueda por tokens y resaltado de coincidencias del selector de tareas/grupos.
 *
 * Se extrajo del input de reparaciones manuales: es lógica de texto sin estado, que el
 * componente sólo consume.
 */

export function normalizeText(value: string): string {
  // NFD separa la tilde en un caracter aparte; se descartan las marcas
  // combinantes (U+0300..U+036F) para que "motor" encuentre tambien "Motor".
  const decomposed = value.normalize('NFD');
  let result = '';
  for (const char of decomposed) {
    const code = char.charCodeAt(0);
    if (code < 0x0300 || code > 0x036f) result += char;
  }
  return result.toLowerCase();
}

/**
 * Palabras sueltas de lo buscado, normalizadas.
 *
 * Se busca por tokens y no por la frase entera para no perder la busqueda
 * multi-palabra: "motor aceite" tiene que encontrar el grupo aunque "motor" este
 * en el nombre y "aceite" en una tarea interna.
 */
export function tokenizeQuery(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

/** El texto contiene TODOS los tokens (no alcanza con uno) */
export function matchesAllTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const normalized = normalizeText(text);
  return tokens.every((token) => normalized.includes(token));
}

/** Tramos [inicio, fin) donde aparece alguno de los tokens, ya fusionados */
export function findTokenRanges(normalizedText: string, tokens: string[]): [number, number][] {
  const ranges: [number, number][] = [];

  for (const token of tokens) {
    let from = normalizedText.indexOf(token);
    while (from !== -1) {
      ranges.push([from, from + token.length]);
      from = normalizedText.indexOf(token, from + token.length);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);

  // Dos tokens pueden solaparse ("motor" y "mot"): se fusionan para no anidar <mark>
  return ranges.reduce<[number, number][]>((merged, range) => {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
      return merged;
    }
    merged.push([...range] as [number, number]);
    return merged;
  }, []);
}

/**
 * Resalta dentro de `text` los tramos que coincidieron con lo buscado.
 *
 * El cliente reportó que el buscador "devuelve resultados erróneos": escribía
 * "motor" y aparecían grupos sin esa palabra en el nombre, porque el match venía
 * de una de sus tareas internas. Marcar la coincidencia hace evidente el porqué.
 */
export function HighlightedText({ text, tokens }: { text: string; tokens: string[] }) {
  const normalizedText = normalizeText(text);

  // Los índices solo son trasladables al texto original si normalizar no cambió
  // la longitud (pasa con caracteres ya descompuestos). Si cambió, no se resalta.
  if (tokens.length === 0 || normalizedText.length !== text.length) return <>{text}</>;

  const ranges = findTokenRanges(normalizedText, tokens);
  if (ranges.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}
