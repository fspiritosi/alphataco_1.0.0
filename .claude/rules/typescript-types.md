# NO `:any` - SIEMPRE Inferir Tipos

**NUNCA** tipar datos como `:any` o `:Any`. SIEMPRE inferir el tipado usando el tipo de retorno de las funciones:

```typescript
// ❌ INCORRECTO - NUNCA hacer esto
const data: any = await fetchData();
function handleData(data: any) { ... }

// ✅ CORRECTO - Usar Awaited<ReturnType<typeof function>>
export async function getRemitos(rowId: string) {
  const { data, error } = await supabase
    .from('remitos')
    .select('*')
    .eq('daily_report_row_id', rowId);

  if (error) throw error;
  return data || [];
}

// Exportar el tipo
export type Remito = Awaited<ReturnType<typeof getRemitos>>[number];

// Usar el tipo
const remitos: Awaited<ReturnType<typeof getRemitos>> = await getRemitos(rowId);
type MyData = Awaited<ReturnType<typeof fetchData>>;
```
