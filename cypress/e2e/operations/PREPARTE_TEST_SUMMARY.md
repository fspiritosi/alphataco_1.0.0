# Test Implementado: Preparte (Gestor de Pedidos)

## ✅ Implementación Completada

### Archivo

`cypress/e2e/operations/preparte.cy.ts`

## 🏷️ data-testid Agregados

### En PreparteManager.tsx

- ✅ `preparte-title` - Título "Gestión de Pedidos"
- ✅ `nuevo-pedido-button` - Botón "Nuevo Pedido"

### En StatusCards.tsx

- ✅ `status-card-todos` - Card "Todos"
- ✅ `status-card-pendiente` - Card "Pendientes"
- ✅ `status-card-reprogramado` - Card "Reprogramados"
- ✅ `status-card-confirmado` - Card "Confirmados"
- ✅ `status-card-cancelado` - Card "Cancelados"
- ✅ `status-card-rechazado` - Card "Rechazados"
- ✅ `status-card-vencido` - Card "Vencidos"

### En PreparteForm.tsx

- ✅ `cliente-select` - Selector de cliente (MultiSelectCombobox)
- ✅ `contrato-select` - Selector de contrato (MultiSelectCombobox)

## 🧪 Tests Implementados

### 1. Navigation (2 tests)

- ✅ Verifica navegación a la URL correcta
- ✅ Verifica que el título "Gestión de Pedidos" se muestra

### 2. Status Cards - View (1 test)

- ✅ Verifica que todas las 7 cards de estado se renderizan
- ✅ Verifica que cada card tiene el título correcto:
  - Todos
  - Pendientes
  - Reprogramados
  - Confirmados
  - Cancelados
  - Rechazados
  - Vencidos

### 3. CREATE - Open Modal and Select Cliente/Contrato (3 tests)

- ✅ Verifica que el modal se abre al hacer click en "Nuevo Pedido"
- ✅ Verifica que los campos Cliente y Contrato están visibles
- ✅ Selecciona "Cliente Testing E2E" del dropdown
- ✅ Cierra el popover del cliente
- ✅ Verifica que el cliente fue seleccionado
- ✅ Selecciona "Servicio Testing E2E" del dropdown
- ✅ Cierra el popover del contrato
- ✅ Verifica que el contrato fue seleccionado
- ✅ Verifica que los campos de fecha existen con valores por defecto (hoy)

## 📊 Datos de Testing Usados

```
Cliente ID: 22222222-2222-2222-2222-222222222222
Nombre: Cliente Testing E2E

Contrato ID: 33333333-3333-3333-3333-333333333333
Nombre: Servicio Testing E2E
```

Estos datos ya existen en `supabase/seed-testing.sql`.

## 🎯 Validaciones Implementadas

### ✅ Completadas

1. Verificar texto "Gestión de Pedidos"
2. Verificar que las 7 cards de estado se renderizan con títulos correctos
3. Abrir modal "Nuevo Pedido"
4. Seleccionar cliente "Cliente Testing E2E"
5. Cerrar popover de cliente
6. Seleccionar contrato "Servicio Testing E2E"
7. Cerrar popover de contrato
8. Verificar que las fechas tienen valores por defecto (hoy)

### 🔜 Pendientes (para siguiente iteración)

- Seleccionar jornada
- Seleccionar tipo de servicio
- Llenar solicitante
- Seleccionar sector
- Seleccionar área
- Seleccionar equipos
- Seleccionar items con cantidad
- Agregar observaciones
- Guardar el pedido
- Verificar mensaje de éxito
- Verificar que aparece en la tabla

## 🚀 Cómo Ejecutar

```bash
# Modo interactivo (recomendado)
npm run cypress
# Luego seleccionar: operations/preparte.cy.ts

# Modo headless
npx cypress run --spec "cypress/e2e/operations/preparte.cy.ts"
```

## 📝 Notas

- El test usa waits estratégicos para esperar la carga de datos
- Los popovers se cierran haciendo click nuevamente en el selector
- Se usa `scrollIntoView()` para asegurar que los elementos sean visibles
- Las fechas se mantienen con valores por defecto (hoy)
- Se verifica la selección mediante el texto visible en el selector

## 🔄 Próximos Pasos

Cuando estés listo para continuar, indica qué validaciones adicionales quieres agregar al test.
