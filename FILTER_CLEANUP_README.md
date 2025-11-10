# Sistema de Limpieza de Filtros de Tablas

## 📋 Problema

Cuando se hacen cambios en la estructura de las tablas (agregar/quitar columnas, cambiar filtros, etc.), los filtros guardados en localStorage y cookies pueden causar errores o comportamientos inesperados.

## ✅ Solución Implementada

Se implementó un sistema de **limpieza única** que se ejecuta automáticamente cuando los usuarios cargan la aplicación.

### Archivos Creados

1. **`src/lib/one-time-filter-cleanup.ts`**

   - Contiene la lógica de limpieza
   - Se ejecuta solo una vez por versión
   - Limpia tanto localStorage como cookies

2. **`src/components/FilterCleanupInitializer.tsx`**
   - Componente cliente que ejecuta la limpieza
   - Se monta una vez en el layout del dashboard

### Cómo Funciona

1. Al cargar el dashboard, se ejecuta `cleanupObsoleteFilters()`
2. Verifica si ya se ejecutó para la versión actual
3. Si no se ha ejecutado:
   - Limpia todas las entradas de localStorage que contengan filtros de tablas
   - Limpia todas las cookies relacionadas con tablas
   - Marca la limpieza como completada para esta versión
4. Si ya se ejecutó, no hace nada (es idempotente)

### Cuándo Usar

**Cuando necesites limpiar filtros obsoletos:**

1. Abre `src/lib/one-time-filter-cleanup.ts`
2. Cambia la constante `CLEANUP_VERSION`:
   ```typescript
   const CLEANUP_VERSION = '2025-01-v2'; // Incrementa la versión
   ```
3. Haz commit y deploy
4. La próxima vez que los usuarios carguen la app, se limpiarán automáticamente los filtros

### Ejemplo de Uso

```typescript
// Antes de hacer cambios en la estructura de tablas:
// 1. Cambia la versión en one-time-filter-cleanup.ts
const CLEANUP_VERSION = '2025-02-v1'; // Nueva versión

// 2. Haz tus cambios en las tablas
// 3. Deploy
// 4. Los usuarios verán en consola:
// [Filter Cleanup] ✅ Cleanup completed successfully!
//   - Removed 5 localStorage entries
//   - Removed 3 cookies
//   - Version: 2025-02-v1
```

## 🔧 Funciones Disponibles

### `cleanupObsoleteFilters()`

Limpia filtros obsoletos si no se ha ejecutado para la versión actual.

### `forceCleanupFilters()`

Fuerza la limpieza sin importar la versión. Útil para debugging.

```typescript
// En la consola del navegador:
import { forceCleanupFilters } from '@/lib/one-time-filter-cleanup';
forceCleanupFilters();
```

## 📊 Qué se Limpia

### localStorage

- Todas las entradas que empiecen con `table-filters-`
- Entradas que contengan `Table` o `Columns`

### Cookies

- Cookies que contengan: `Table`, `table`, `filters`, `Columns`, `visibility`

## 🎯 Ventajas

- ✅ **Simple**: Solo cambias una versión
- ✅ **Automático**: Los usuarios no tienen que hacer nada
- ✅ **Idempotente**: Se ejecuta solo una vez por versión
- ✅ **Sin impacto**: No afecta el rendimiento después de la primera ejecución
- ✅ **Flexible**: Puedes forzar limpieza cuando quieras

## 🚨 Importante

- **NO** borres el archivo `one-time-filter-cleanup.ts`
- **NO** cambies la versión sin necesidad (solo cuando hagas cambios en tablas)
- La limpieza se ejecuta en el cliente, no en el servidor
- Los filtros se limpian completamente, los usuarios tendrán que configurarlos de nuevo

## 📝 Historial de Versiones

- `2025-01-v1` - Limpieza inicial implementada (Enero 2025)

---

**Nota:** Este sistema reemplaza la necesidad de versionado complejo en cada tabla individual.
