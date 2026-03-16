# Queries Eficientes

Analiza el contexto de uso para asegurar que las peticiones sean eficientes:

- **NO** realizar N+1 queries
- **NO** traer todos los datos y filtrar en el frontend
- **NO** traer catalogos completos para hacer lookups en el frontend
- **SIEMPRE** filtrar en la query (hook useQuery o server action)
- **SIEMPRE** resolver nombres/relaciones con Prisma `include`/`select` (nuevo estandar) o JOINs de Supabase (legacy), NO con lookups client-side
- **SIEMPRE** optimizar las peticiones

## Migracion incremental Supabase → Prisma

Al encontrar codigo que usa `supabaseServer()`, `supabaseBrowser()` o `.from().select()` para fetching de datos: **preguntar al usuario si desea migrar esa implementacion puntual a Prisma**. El cambio reemplaza solo el mecanismo de fetch sin alterar la logica ni el funcionamiento.

```typescript
// ❌ INCORRECTO - Traer todo y filtrar en frontend
const allEmployees = await getAllEmployees();
const activeEmployees = allEmployees.filter((e) => e.is_active);

// ✅ CORRECTO - Filtrar en la query
const activeEmployees = await getActiveEmployees();

// ❌ INCORRECTO - Traer catalogo completo para resolver nombres en frontend
const allItems = await getAllItems();
const itemName = allItems.find((i) => i.id === row.item)?.item_name;

// ✅ CORRECTO - Resolver con include/select en Prisma (nuevo estandar)
const data = await prisma.preparte.findMany({
  include: { service_items: { select: { id: true, item_name: true } } },
});
// En la tabla: row.service_items?.item_name (ya viene resuelto)
```
