# COD-374 (parte 2) — Ítem manual en pedido y solicitud de mantenimiento

**Fecha**: 2026-04-14
**Ticket**: [COD-374 — Mantenimiento](https://linear.app/codecontrol-sas/issue/COD-374/mantenimiento) (Urgent, In Progress)
**Alcance**: Punto 2 del ticket — "Agregar la posibilidad de cargar un ítem manual al pedido de Mantenimiento y a la solicitud de mantenimiento, es decir un campo adicional que no venga del checklist".

---

## 1. Problema

Hoy todo `maintenance_request_item` (en solicitudes) o `maintenance_order_item` (en pedidos/órdenes) está **forzado** a referenciar un ítem del catálogo del template de checklist, vía un `checklist_deviation` que a su vez apunta a un `item_code` del template.

Los usuarios necesitan poder describir problemas puntuales que **no están cubiertos** por ningún ítem del checklist (ej: "el rodamiento delantero izquierdo hace un ruido al girar"). Ese texto es **ad-hoc**, no reutilizable, solo relevante para ESE pedido/solicitud — no debe crear un ítem permanente en el catálogo.

## 2. Solución — visión general

Un nuevo componente `ManualItemsInput` que se enchufa en los 3 puntos donde el usuario arma un pedido/solicitud:

1. **`NuevoPedidoChecklistForm`** (wizard paso 2 — pedido manual).
2. **`CriticalDeviationsRepairModal`** (solicitud desde checklist con ítems fallidos).
3. **`AdditionalDeviationModal`** (solicitud desde checklist 100% OK — implementado en parte 3).

Cada ítem manual se persiste como un `checklist_deviation` con convención `item_code = 'manual'`, `section_code = null`, `is_critical = false`, `item_label = <texto libre del usuario>`. Luego su `maintenance_request_item` (o `maintenance_order_item`) correspondiente se crea enlazado, igual que cualquier otro.

**Sin migración de schema** — se aprovecha que las columnas existentes ya soportan la forma (el `item_label` es `String` libre y ninguna FK al template es obligatoria).

**Aislamiento para poder "apagar" la feature** — la feature vive enteramente en: (a) el componente nuevo, (b) un parámetro `manualItems` opcional en 3 server actions. Para sacar la feature de cualquiera de los 3 contenedores basta con comentar 1 import + 1 JSX tag. Sin otras modificaciones.

---

## 3. Arquitectura

### 3.1 Componente nuevo

**Archivo**: `src/features/Mantenimiento/shared/components/ManualItemsInput.tsx`

**Contrato**:

```ts
export type ManualItem = {
  /** ID local (no persistido, solo para key/remove en React) */
  localId: string;
  label: string;
};

type ManualItemsInputProps = {
  items: ManualItem[];
  onChange: (next: ManualItem[]) => void;
  disabled?: boolean;
};
```

Estado controlado desde arriba (parent tiene `useState<ManualItem[]>`). El componente no persiste nada — solo maneja UI de agregar/quitar y emite el nuevo array.

### 3.2 Cambios en server actions

Cada server action existente que crea `maintenance_request` o `maintenance_order` recibe un parámetro adicional opcional:

```ts
manualItems?: Array<{ label: string }>;
```

Al persistir:

1. Por cada item manual, `INSERT INTO checklist_deviations` con:
   - `checklist_answer_id`: el real si aplica (AdditionalDeviationModal, CriticalDeviationsRepairModal), `null` en NuevoPedido wizard.
   - `equipment_id`: del pedido/solicitud.
   - `item_code`: `'manual'` (marca convencional para identificarlos posteriormente).
   - `item_label`: el texto libre.
   - `section_code`: `null`.
   - `is_critical`: `false`.
   - `driver_comment`: `null` (el texto ya vive en `item_label`).
   - `created_by_user_id`: `profile.id`.
2. Por cada `checklist_deviation` creado, insertar su `maintenance_request_item` (o `maintenance_order_item`) correspondiente, vinculado al `maintenance_request_id` / `maintenance_order_id` y al `checklist_deviation_id` recién creado.

**3 server actions afectadas**:

| Archivo                                             | Función                                   | Contexto                                       |
| --------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `SolicitudesMantenimiento/actions/actionsServer.ts` | `createOrUpdateMaintenanceRequest`        | Flujo crítico (desvíos detectados)             |
| `SolicitudesMantenimiento/actions/actionsServer.ts` | `createManualDeviationsFromChecklist`     | Flujo additional (100% OK, parte 3)            |
| `NuevoPedido/actions/actionsServer.ts`              | `createMaintenanceRequestPendingApproval` | Wizard NuevoPedido (pending approval)          |
| `NuevoPedido/actions/actionsServer.ts`              | `createMaintenanceOrderFromDeviations`    | Wizard NuevoPedido (auto-aprobada, crea orden) |

Total: **4 server actions** (el wizard tiene 2 variantes — pending vs direct order).

### 3.3 Cambios en contenedores

Cada contenedor agrega:

1. Un `useState<ManualItem[]>([])` local.
2. Un `<ManualItemsInput items={manualItems} onChange={setManualItems} />` en un lugar apropiado del JSX.
3. En el submit, pasa `manualItems: manualItems.map(m => ({ label: m.label }))` a la server action correspondiente.
4. Resetea `manualItems` a `[]` cuando corresponda (cierre del modal/wizard, submit exitoso).

**Qué NO cambia**:

- Schema Prisma — cero migraciones.
- Estructura de `checklist_deviations`, `maintenance_request_items`, `maintenance_order_items`.
- `CreateChecklistAnswer`.
- `NormalizedChecklistForm` (no tiene relación con ítems manuales; los ítems manuales viven dentro de los modales/wizard).

---

## 4. UI — `ManualItemsInput`

Aplicación de `frontend-design` adaptada a herramienta de productividad diaria: coherencia con shadcn/Tailwind, jerarquía clara, fricción mínima para uso repetitivo.

### 4.1 Layout

```
┌─ Otros ítems (no listados en el checklist) ────────────┐
│                                                         │
│  📝 El rodamiento delantero hace ruido al girar     [×] │
│  📝 Cinturón del piloto roto en el enganche         [×] │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Describí el problema...                          │  │
│  │ (auto-grow, 2-6 rows)                            │  │
│  └──────────────────────────────────────────────────┘  │
│                                         [ + Agregar ]   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Decisiones

**Contenedor**

- `<Card>` con `CardHeader` compacto conteniendo el título `"Otros ítems (no listados en el checklist)"`.
- Se renderiza al lado de las Cards del `ChecklistItemPicker` (o debajo de la lista de desvíos en el modal crítico, o debajo del selector del wizard).

**Lista de ítems**

- `<ul role="list">` con cada ítem como fila `<li role="listitem">`.
- Fila: icono `<PencilLine className="h-4 w-4 text-muted-foreground" />` + texto del ítem (`whitespace-pre-wrap` para respetar saltos de línea) + botón X a la derecha.
- Hover sobre fila → fondo `bg-accent/30` transición suave.
- Botón X con `aria-label="Quitar ítem manual"`, tap target ≥ 40×40 px.
- Si lista vacía, no se renderiza la sección de lista (solo el textarea + botón).

**Textarea**

- Multi-línea con auto-grow. Implementación: usar `field-sizing: content` via Tailwind `field-sizing-content` (soporta todos los navegadores modernos) con `min-h` y `max-h` para bound.
- `rows={2}` inicial.
- Placeholder: `"Describí el problema..."`.
- Sin `maxLength` HTML, sin `.max()` en Zod.

**Botón Agregar**

- `<Button size="sm">` con icono `<Plus className="h-4 w-4" />` + texto `"Agregar"`.
- Deshabilitado si el textarea está vacío o solo espacios.
- Al click: trimea el valor, si queda no vacío → agrega al array (con un `localId` generado con `crypto.randomUUID()`), limpia el textarea, devuelve focus al textarea.
- Alineación: derecha en desktop (`sm:justify-end`), full-width en mobile.

**Interacciones**

- `Cmd/Ctrl + Enter` en el textarea → agrega (atajo para power users). `Enter` solo agrega nueva línea.
- Sin confirmación al borrar (agregarlos es trivial).

**Accesibilidad**

- Textarea con `aria-label="Describir ítem manual"`.
- Botón X de cada ítem con `aria-label="Quitar ítem manual"`.
- Lista como `<ul>` / `<li>` semánticos.

**Mobile**

- Botón "+ Agregar" full-width en viewport sm.
- Textarea full-width.

---

## 5. Backend — detalles

### 5.1 Nuevo tipo compartido

Agregar a los archivos `actions.server.ts` (o equivalente) donde aplique, un tipo local:

```ts
type ManualItemInput = {
  label: string;
};
```

No exportar globalmente — cada server action lo usa inline para mantener aislamiento.

### 5.2 Lógica de inserción (idéntica en las 4 funciones)

Pseudo-código dentro de la transacción:

```ts
if (input.manualItems && input.manualItems.length > 0) {
  const manualDeviations = await Promise.all(
    input.manualItems.map((m) =>
      tx.checklist_deviations.create({
        data: {
          checklist_answer_id: input.checklistAnswerId ?? null,
          equipment_id: input.equipmentId,
          item_code: 'manual',
          item_label: m.label.trim(),
          section_code: null,
          is_critical: false,
          created_by_user_id: profile.id,
        },
        select: { id: true },
      })
    )
  );

  const manualDeviationIds = manualDeviations.map((d) => d.id);

  await tx.maintenance_request_items.createMany({
    data: manualDeviationIds.map((devId) => ({
      maintenance_request_id: request.id, // o maintenance_order_id en NuevoPedido order
      checklist_deviation_id: devId,
      repair_type_id: null,
      driver_comment: null,
      status: 'pending',
    })),
  });
}
```

Para las funciones de NuevoPedido que crean `maintenance_order_items` en lugar de `maintenance_request_items`, cambiar la segunda query a `tx.maintenance_order_items.createMany` con el shape apropiado.

### 5.3 Validación del server

- `label.trim().length > 0` — descartar silenciosamente los vacíos (el UI ya no permite agregar vacíos, pero defense in depth).
- Sin max length (per regla del usuario: "no tenemos que ponerle límite").

### 5.4 Logger

En cada función afectada, agregar log `debug` al inicio cuando `manualItems.length > 0`:

```ts
if (input.manualItems && input.manualItems.length > 0) {
  serverLogger.debug('Se incluyeron ítems manuales', {
    data: { count: input.manualItems.length },
  });
}
```

---

## 6. Cambios por contenedor

### 6.1 `AdditionalDeviationModal`

- Agregar `useState<ManualItem[]>([])`.
- Renderizar `<ManualItemsInput />` justo **debajo** del `<ChecklistItemPicker />` dentro del body scrollable.
- `submitDisabled` se relaja a: `isSubmitting || !selectedSupervisorId || (selectedItems.length === 0 && manualItems.length === 0)`. Ahora el submit es válido si hay **al menos** un ítem (template o manual).
- En `handleSubmit`, pasar `manualItems: manualItems.map(m => ({ label: m.label }))` al payload de `createManualDeviationsFromChecklist`.
- Reset en `useEffect([isOpen])`: `setManualItems([])` cuando `isOpen: true`.

### 6.2 `CriticalDeviationsRepairModal`

- Agregar `useState<ManualItem[]>([])`.
- Renderizar `<ManualItemsInput />` **después** del listado de desvíos detectados (críticos + no críticos).
- En `handleSubmit`, pasar `manualItems` al payload de `createOrUpdateMaintenanceRequest`.
- Reset en `useEffect([isOpen])`: `setManualItems([])`.
- **No cambia** la validación de submit — el modal crítico siempre tiene al menos un desvío detectado, así que los manuales son aditivos.

### 6.3 `NuevoPedidoChecklistForm` (wizard)

- Agregar `useState<ManualItem[]>([])` en el scope del wizard.
- Renderizar `<ManualItemsInput />` al **final del paso 2** (`renderStep2Items`), después de las Cards de secciones del template.
- En los submits del wizard (tanto el que dispara `createMaintenanceRequestPendingApproval` como `createMaintenanceOrderFromDeviations`), pasar `manualItems`.
- Relajar la validación del paso 2 para permitir avanzar si hay al menos 1 ítem (template o manual).
- Reset al abrir el wizard o al cambiar de equipo.

---

## 7. Casos edge

| Caso                                                       | Comportamiento                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Usuario agrega 3 ítems manuales y 0 del template           | Submit válido. Se crea `maintenance_request` con 3 items, los 3 con `checklist_deviation` de `item_code='manual'` |
| Usuario agrega 0 ítems manuales (ignora la feature)        | Todo funciona exactamente como antes; la UI muestra el card vacío (solo textarea + botón) pero sin impacto        |
| Texto del ítem con saltos de línea                         | Se persiste tal cual. Render usa `whitespace-pre-wrap`                                                            |
| Texto con solo espacios                                    | Botón "Agregar" queda deshabilitado — no se permite                                                               |
| Usuario borra un ítem después de agregarlo                 | `setManualItems(items.filter(i => i.localId !== id))`                                                             |
| Submit falla                                               | Toast destructivo; `manualItems` queda intacto en state; usuario puede reintentar sin re-escribir                 |
| Usuario cierra el modal/wizard sin submit                  | Reset en siguiente apertura                                                                                       |
| Ítems con texto extremadamente largo (ej: 5000 caracteres) | Se persisten — BD acepta `text` sin límite                                                                        |

---

## 8. Reglas del proyecto aplicadas

- **`frontend-design:frontend-design`** — UI coherente con shadcn, icono `PencilLine` para distinguir visualmente de ítems del template, sin decoraciones innecesarias.
- **`vercel-react-best-practices`** — `useCallback` en handlers, `useMemo` donde aplique, sin `useEffect` para lógica de click (todo al onClick).
- **`typescript-types.md`** — tipos inferidos, sin `:any`.
- **`logger.md`** — `serverLogger` en server actions, sin `console.*`.
- **`server-actions.md`** — contratos en las funciones ya existentes; no se crean rutas API.
- **`no-native-dialogs.md`** — no aplica (no se usan dialogs nuevos).
- **`forms.md`** — no se usa react-hook-form aquí porque el componente es controlled state simple; consistente con `ChecklistItemPicker` y el patrón del modal crítico.
- **`code-language.md`** — identificadores en inglés, strings de UI en español.
- **`migrations.md`** — NO se requiere migración. El schema ya soporta el caso.

---

## 9. Qué NO cambia

- Schema Prisma — cero migraciones.
- `CreateChecklistAnswer` — intacta.
- `NormalizedChecklistForm` — intacto (la feature vive dentro de los modales/wizard, no del form de checklist).
- `AllGoodDeviationPromptDialog` — intacto.
- `ChecklistItemPicker` — intacto (el `ManualItemsInput` es un complemento, no una modificación).
- `page.tsx` de las rutas afectadas — intactos.
- Flujo de ítems del template en los 3 contenedores — intacto.

---

## 10. Rollback plan

Si en el futuro se decide **remover** la feature de alguno de los 3 contenedores:

1. Comentar el import `ManualItemsInput` y el JSX tag en ese contenedor.
2. Dejar de pasar `manualItems` a la server action correspondiente.
3. No se requiere cambio en la server action (el parámetro es opcional).

Para remover la feature **completamente**:

1. Eliminar `ManualItemsInput.tsx`.
2. Eliminar el parámetro `manualItems` y el bloque de inserción de cada una de las 4 server actions.
3. Los `checklist_deviations` con `item_code='manual'` ya creados siguen existiendo y funcionando — no requieren cleanup.

---

## 11. Resumen final

Un componente aislado (`ManualItemsInput`) permite al usuario describir problemas ad-hoc que no están en el template del checklist. Se enchufa en los 3 puntos de creación de pedidos/solicitudes (modal crítico, modal additional, wizard NuevoPedido). Cada ítem manual se persiste como `checklist_deviation` con `item_code='manual'` + su correspondiente `maintenance_request_item`/`maintenance_order_item`. Sin migración, sin límites, sin criticidad. Aislado para fácil rollback parcial o total.
