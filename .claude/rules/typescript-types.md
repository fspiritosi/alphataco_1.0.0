# NO `:any` - SIEMPRE Inferir Tipos

**NUNCA** tipar datos como `:any` o `:Any`. SIEMPRE inferir el tipado usando el tipo de retorno de las funciones:

```typescript
// ❌ INCORRECTO - NUNCA hacer esto
const data: any = await fetchData();
function handleData(data: any) { ... }

// ✅ CORRECTO - Usar Awaited<ReturnType<typeof function>>
export async function getRemitos(rowId: string) {
  const remitos = await prisma.remitos.findMany({
    where: { daily_report_row_id: rowId },
  });
  return remitos;
}

// Exportar el tipo
export type Remito = Awaited<ReturnType<typeof getRemitos>>[number];

// Usar el tipo
const remitos: Awaited<ReturnType<typeof getRemitos>> = await getRemitos(rowId);
type MyData = Awaited<ReturnType<typeof fetchData>>;
```
