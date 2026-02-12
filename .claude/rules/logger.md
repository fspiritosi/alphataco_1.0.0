# Logger en Lugar de console.\* (CON REEMPLAZO AUTOMATICO)

**SIEMPRE** usar el logger personalizado de `src/lib/logger.ts` en lugar de `console.log`, `console.error`, `console.warn`, etc.

El logger solo emite logs si `NEXT_PUBLIC_SHOW_LOGS === 'true'`, lo que permite controlar el logging en produccion.

## REGLA CRITICA: Reemplazo Automatico de console.\*

**IMPORTANTE**: Si encuentras cualquier uso de `console.log`, `console.error`, `console.warn`, `console.debug`, `console.group`, `console.table`, `console.time`, o cualquier otro metodo de `console.*` en el codigo, **DEBES** reemplazarlo inmediatamente por el logger correspondiente.

## Proceso de Reemplazo

1. **Detectar** cualquier uso de `console.*` en el archivo
2. **Agregar** el import del logger si no existe: `import { logger } from '@/lib/logger';` o `import { Logger } from '@/lib/logger';`
3. **Reemplazar** cada llamada de `console.*` por el metodo equivalente del logger
4. **Verificar** que todas las referencias a `console.*` hayan sido eliminadas

## Mapeo de Reemplazo

| console.\*                               | logger.\*                            | Ejemplo                                                                     |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `console.log()`                          | `logger.info()`                      | `console.log('Mensaje')` → `logger.info('Mensaje')`                         |
| `console.error()`                        | `logger.error()`                     | `console.error('Error:', err)` → `logger.error('Error', { data: { err } })` |
| `console.warn()`                         | `logger.warn()`                      | `console.warn('Advertencia')` → `logger.warn('Advertencia')`                |
| `console.debug()`                        | `logger.debug()`                     | `console.debug('Debug info')` → `logger.debug('Debug info')`                |
| `console.group()` / `console.groupEnd()` | `logger.group()`                     | `console.group('Grupo')` → `logger.group('Grupo', () => { ... })`           |
| `console.table()`                        | `logger.table()`                     | `console.table(data)` → `logger.table(data, 'Descripcion')`                 |
| `console.time()` / `console.timeEnd()`   | `logger.time()` / `logger.timeEnd()` | `console.time('label')` → `logger.time('label')`                            |

## Ejemplo de Reemplazo Completo

```typescript
// ❌ ANTES - Con console.*
console.log('Iniciando proceso');
console.group('Operacion');
console.log('Paso 1');
console.log('Paso 2');
console.groupEnd();
console.error('Error:', error);
console.table(employees);

// ✅ DESPUES - Con logger
import { logger } from '@/lib/logger';

logger.info('Iniciando proceso');
logger.group('Operacion', () => {
  logger.info('Paso 1');
  logger.info('Paso 2');
});
logger.error('Error', { data: { error } });
logger.table(employees, 'Lista de empleados');
```

## Uso del Logger

```typescript
import { logger } from '@/lib/logger';

// O crear un logger con scope (recomendado)
import { Logger } from '@/lib/logger';
const logger = new Logger('MyComponent');

// Logging basico
logger.info('Empleado creado exitosamente');
logger.debug('Cargando datos del empleado...');
logger.warn('Falta informacion opcional');
logger.error('Error al guardar empleado', {
  data: { error: error.message, employeeId },
});
```

## Metodos Disponibles del Logger

```typescript
// Niveles de Log
logger.debug(message: string, meta?: LogMeta);
logger.info(message: string, meta?: LogMeta);
logger.warn(message: string, meta?: LogMeta);
logger.error(message: string, meta?: LogMeta);

// Helpers Especiales
logger.group('Operacion Completa', () => {
  logger.info('Paso 1 completado');
  logger.info('Paso 2 completado');
}, { collapsed: true });

logger.table(employees, 'Lista de empleados');

logger.time('Carga de datos');
// ... codigo ...
logger.timeEnd('Carga de datos');

logger.separator('Inicio de seccion');
```

## Logger con Scope (Recomendado)

```typescript
// En componentes
import { Logger } from '@/lib/logger';
const logger = new Logger('EmployeesTable');

// En features
const logger = new Logger('features/Employees');

// Clonar logger con nuevo scope
const baseLogger = new Logger('BaseScope');
const childLogger = baseLogger.withScope('ChildScope');
```

**Regla de Oro**: NUNCA dejes codigo con `console.*` sin reemplazar. Si ves un `console.log` o cualquier `console.*`, cambialo inmediatamente por el logger correspondiente.
