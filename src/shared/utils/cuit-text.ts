/** CUIT con guiones (`30712345678` → `30-71234567-8`). Si no tiene 11 dígitos, se devuelve tal cual. */
export function formatCuitText(cuit: string): string {
  return /^\d{11}$/.test(cuit) ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit;
}
