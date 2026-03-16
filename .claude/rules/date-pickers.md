# Date Pickers con Escritura Directa

**Todo campo de fecha individual (date picker, date input) DEBE permitir que el usuario escriba la fecha directamente**, ademas de usar el calendario. El comportamiento debe ser equivalente al input nativo `<input type="date">` de HTML, pero implementado con componentes de shadcn/ui.

## Alcance

| Componente                          | Aplica esta regla                    |
| ----------------------------------- | ------------------------------------ |
| Date picker de fecha individual     | SI — debe permitir escritura directa |
| Date range picker (rango de fechas) | NO — queda como esta, no se modifica |

## Implementacion correcta

Usar un `<Input type="text">` o `<Input type="date">` de shadcn combinado con el `Calendar` y `Popover`, de forma que el campo de texto sea editable. El usuario debe poder:

1. Escribir la fecha manualmente en el input
2. O abrirlo con el icono de calendario para seleccionar visualmente

```typescript
// ✅ CORRECTO - Input editable + popover con calendario
// El input permite escritura directa Y seleccion por calendario

// ❌ INCORRECTO - Solo boton que abre el calendario, sin campo de texto editable
<Button variant="outline">
  <CalendarIcon />
  {date ? format(date, 'PPP') : 'Seleccionar fecha'}
</Button>
```

## Deteccion automatica y correccion incremental

Al leer cualquier archivo que contenga un date picker de fecha individual: verificar si el usuario puede escribir la fecha directamente o solo puede seleccionarla por calendario.

**Si se detecta un date picker que NO permite escritura directa** (y NO es un date range): **PREGUNTAR al usuario si desea corregirlo antes de continuar** con la tarea principal.

> "Encontre que [componente/formulario] tiene un date picker que no permite escribir la fecha directamente. ¿Queres que lo corrija ahora?"
