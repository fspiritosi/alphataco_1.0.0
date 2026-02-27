/**
 * Normaliza el valor del resultado a una clave canónica:
 * 'B' | 'passed' → 'passed'
 * 'M' | 'failed' → 'failed'
 * null/undefined → 'pending'
 */
export function normalizeResult(result: string | null | undefined): 'passed' | 'failed' | 'pending' {
  if (result === 'B' || result === 'passed') return 'passed';
  if (result === 'M' || result === 'failed') return 'failed';
  return 'pending';
}
