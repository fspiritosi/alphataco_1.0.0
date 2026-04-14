# COD-374 (parte 3) — Checklist 100% OK con opción a registrar desvío manual

**Fecha**: 2026-04-14
**Ticket**: [COD-374 — Mantenimiento](https://linear.app/codecontrol-sas/issue/COD-374/mantenimiento) (Urgent, In Progress)
**Alcance**: Punto 3 del ticket — "Al cerrar un checklist que esté 100% ok, preguntar si igual quiere hacer una solicitud de mantenimiento (solo ítem libre)".

---

## 1. Problema

Cuando un usuario responde un checklist y **ninguno** de los ítems queda marcado como fallido (`"M"`, `false` o `"false"`), el flujo actual hace:

1. `toast.success('Checklist guardado correctamente')`
2. `setTimeout(1500ms)` → redirect.

El usuario nunca tiene la posibilidad de reportar un desvío que notó por fuera del checklist (por ejemplo: "los frenos responden, pero escuché un ruido raro"). Hoy esa información se pierde o se ingresa después por otro flujo menos ergonómico.

El ticket pide que, antes de redirigir, se le pregunte al usuario si igual quiere registrar un desvío. Si dice que sí, debe poder elegir el/los ítems del checklist sobre los que quiere dejar el desvío (como no hay ningún fallido detectado automáticamente, el usuario elige), y el desvío debe comportarse exactamente como un desvío generado por un ítem fallido: vinculado al checklist, genera `maintenance_request` con sus items, entra al flujo de aprobación.

---

## 2. Solución — visión general

Se agrega un paso opcional al branch `failedItems.length === 0` del `onSubmit` del checklist. El flujo queda:

1. Guardar checklist (igual que hoy — `CreateChecklistAnswer` ya corre antes del branch).
2. Mostrar toast de guardado OK.
3. **Nuevo**: abrir un `AlertDialog` preguntando si quiere registrar un desvío.
   4a. **No** → redirect con la misma lógica actual (según `pathname`).
   4b. **Sí** → cerrar el prompt, abrir un modal nuevo (`AdditionalDeviationModal`) con: - Selector sección → ítem (checkbox por ítem, comentario opcional inline). - Selector de supervisor de turno (obligatorio). - Botón "Registrar N desvíos".
4. Al confirmar: se crean `checklist_deviations` vinculados al `checklist_answer_id` + `maintenance_request` + `maintenance_request_items` en una transacción. Redirect post-éxito.

**Principio rector**: clonar el flujo existente de checklists con desvíos detectados, cambiando únicamente la fuente de los ítems (elegidos por el usuario en lugar de detectados automáticamente).

---

## 3. Arquitectura

### 3.1 Punto de intervención

**Archivo**: `src/features/Formularios/Checklists/NormalizedChecklistForm.tsx`
**Rango**: branch `failedItems.length === 0`, líneas ~1198–1217 actuales.

Antes:

```ts
} else {
  toast.success('Checklist guardado correctamente');
  setTimeout(() => { /* redirect */ }, 1500);
}
```

Después:

```ts
} else {
  toast.success('Checklist guardado correctamente');
  setShowAllGoodPrompt(true); // sin setTimeout
}
```

El `createdAnswerId` ya está en state (setteado en línea ~1090 por `CreateChecklistAnswer`), así que el modal posterior tiene acceso al ID del checklist recién guardado.

### 3.2 Componentes nuevos

Todos ubicados en `src/features/Mantenimiento/shared/components/`:

| Archivo                            | Tipo             | Responsabilidad                                                         |
| ---------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `AllGoodDeviationPromptDialog.tsx` | Client Component | `AlertDialog` sí/no previo al modal principal                           |
| `AdditionalDeviationModal.tsx`     | Client Component | Dialog con selector + supervisor + submit                               |
| `ChecklistItemPicker.tsx`          | Client Component | Subcomponente de lista sección→ítem con checkboxes y comentarios inline |

### 3.3 Backend

**Archivo**: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`
**Nueva función**:

```ts
export async function createManualDeviationsFromChecklist(input: {
  checklistAnswerId: string;
  equipmentId: string;
  supervisorId: string;
  driverEmployeeId?: string;
  userId?: string;
  kilometer?: string;
  items: Array<{
    templateItemId: string;
    itemCode: string;
    itemLabel: string;
    sectionCode: string;
    isCritical: boolean;
    comment?: string;
  }>;
}): Promise<{ ok: true; requestId: string; deviationIds: string[] } | { ok: false; error: string }>;
```

**Razón de crearla en lugar de adaptar `createMaintenanceRequestPendingApproval`**: esa función está diseñada para desvíos sin checklist (NuevoPedido manual). Meter un `checklistAnswerId` opcional ensuciaría el contrato. Preferimos una función dedicada que comparta helpers internos si son extraíbles.

**Qué NO se crea**:

- No se modifica `CriticalDeviationsRepairModal`.
- No se modifica `CreateChecklistAnswer`.
- No se modifica `createOrUpdateMaintenanceRequest`.
- No se modifica `createMaintenanceRequestPendingApproval`.
- No se modifica `NuevoPedidoChecklistForm` (el `ChecklistItemPicker` nuevo es una extracción limpia; NuevoPedido seguirá usando su `renderStep2Items` inline).

---

## 4. UI

Aplicación de `frontend-design` adaptada a un modal interno de productividad: coherencia con shadcn/Tailwind existente, jerarquía clara, densidad controlada, acciones explícitas. No se introducen fuentes ni paletas nuevas.

### 4.1 `AllGoodDeviationPromptDialog`

- `<AlertDialog>` de shadcn.
- Icono decorativo sobre el título: `<CircleCheck className="h-6 w-6 text-green-600" />` (refuerza el guardado OK).
- **Título**: `"Checklist guardado correctamente"`.
- **Descripción**: `"No se detectaron ítems con fallos. ¿Querés registrar un desvío de mantenimiento igualmente? Por ejemplo, si notaste algo que el checklist no cubre."`.
- **Footer**:
  - `<AlertDialogCancel>No, continuar</AlertDialogCancel>` — focus por defecto; Enter dispara esto.
  - `<AlertDialogAction>Sí, registrar desvío</AlertDialogAction>` — variante primary.

### 4.2 `AdditionalDeviationModal`

- `<Dialog>` de shadcn con `DialogContent` `max-w-2xl` y `max-h-[85vh]`, `flex flex-col` para header/footer fijos + body scrollable.

**Header** (`DialogHeader`):

- Título: `"Registrar desvío adicional"`.
- Descripción: `"El checklist fue guardado sin fallos. Seleccioná los ítems sobre los que querés dejar un desvío."`.

**Body** (`flex-1 overflow-y-auto`):

- Bloque 1 — **Selector de supervisor** (sticky arriba del scroll, fondo `bg-muted/30` sutil para separarlo de la lista):
  - Label `"Supervisor de turno"` + asterisco requerido.
  - Combobox con búsqueda (reutilizando `fetchSupervisorsForChecklist`).
  - Error inline si submit sin elegir.
- Bloque 2 — **Contador global** (debajo del supervisor, `text-muted-foreground`, texto pequeño):
  - `"{N} ítem(s) seleccionado(s)"`.
- Bloque 3 — **`<ChecklistItemPicker />`**:
  - Una `<Card>` por sección ordenada por `order_index`.
  - `CardHeader` compacto: nombre de sección + badge `{seleccionados}/{total}` (`variant="outline"`).
  - **Collapsible por sección** — primera abierta por defecto, resto cerradas.
  - `CardContent`: filas cliqueables con `[Checkbox] [Label] [Badge "Crítico" si aplica]`.
  - Badge crítico: `variant="destructive"` + `<AlertCircle className="h-3 w-3" />`.
  - Al marcar: aparece inline `<Textarea rows={2} autoFocus placeholder="Comentario (opcional)" />` con transición de altura/opacidad. Al desmarcar, se repliega y pierde el texto.

**Footer** (`DialogFooter` con `border-t`):

- `<Button variant="outline">Cancelar</Button>` → cierra modal + redirect.
- `<Button>Registrar {N} desvío{s}</Button>` primary, label dinámico, deshabilitado si N=0 o sin supervisor. Durante submit muestra `<Loader2 className="animate-spin" />` + `"Registrando..."`.

### 4.3 Accesibilidad

- Dialog `aria-labelledby` → título.
- Checkbox con `id` único + `<label htmlFor>`.
- Focus trap (Radix).
- Enter en supervisor no dispara submit accidentalmente.

### 4.4 Estados

- **Loading submit**: ambos botones del footer deshabilitados, spinner en el primary.
- **Success**: toast `"Solicitud de mantenimiento creada"`, cierre de modal, invalidación de queries, redirect.
- **Error**: toast destructivo con mensaje, modal queda abierto, botones re-habilitados para reintentar.
- **Cancel / X / ESC / click fuera**: redirect sin crear nada (igual comportamiento).

---

## 5. Backend — detalles

### 5.1 Flujo de `createManualDeviationsFromChecklist`

Todo dentro de `prisma.$transaction`:

1. **Validación inicial**:
   - `items.length > 0`.
   - `checklistAnswerId` existe y su `equipment_id === input.equipmentId`.
   - Campos obligatorios presentes.
2. **Obtener `profile.id`** del usuario actual (para `driver_comment_by`).
3. **`checklist_deviations.createMany`**:
   - Un registro por ítem con `checklist_answer_id = input.checklistAnswerId`, `item_code`, `item_label`, `section_code`, `is_critical` (heredado), `driver_comment`, `driver_comment_by`.
   - Re-leer con `findMany` para recuperar los IDs creados.
4. **`maintenance_requests.create`**:
   - `status = 'pending_approval'`.
   - `equipment_id`, `supervisor_id`, `kilometer`, `driver_employee_id`, `checklist_answer_id`, `created_by`.
5. **`maintenance_request_items.createMany`**:
   - Un registro por desvío, enlazando `checklist_deviation_id` + `maintenance_request_id`, `status = 'pending'`, `driver_comment` copiado.
6. **`maintenance_activity_log.create`** con acción apropiada (revisar valores usados por flujos existentes antes de elegir el string).
7. Return `{ ok: true, requestId, deviationIds }`.

### 5.2 Manejo de errores

- `try/catch` externo envolviendo la transacción.
- Return `{ ok: false, error: string }` con mensaje amigable en español.
- Logger scoped: `new Logger('features/SolicitudesMantenimiento/createManualDeviationsFromChecklist')`.
  - `.info` al entrar con `checklistAnswerId`.
  - `.debug` con IDs creados.
  - `.error` en catch con `{ data: { error, input } }`.

### 5.3 Cache invalidation

Post-success en el cliente:

- `invalidateAllMaintenanceQueries()` (helper del proyecto, según memoria).
- Si se necesita algo adicional, replicar exactamente lo que hace `CriticalDeviationsRepairModal.onComplete`.

---

## 6. Estado del cliente en `NormalizedChecklistForm`

Nuevos `useState`:

- `showAllGoodPrompt: boolean`.
- `showAdditionalDeviationModal: boolean`.

Callbacks:

```
AllGoodDeviationPromptDialog:
  onCancel: () => {
    setShowAllGoodPrompt(false);
    // redirect con misma lógica pathname
  }
  onConfirm: () => {
    setShowAllGoodPrompt(false);
    setShowAdditionalDeviationModal(true);
  }

AdditionalDeviationModal:
  onClose: () => {
    setShowAdditionalDeviationModal(false);
    // redirect
  }
  onSuccess: () => {
    setShowAdditionalDeviationModal(false);
    invalidateAllMaintenanceQueries();
    toast.success('Solicitud de mantenimiento creada');
    // redirect
  }
```

La lógica de redirect se extrae en una función local reutilizable por ambos callbacks para no duplicar el `if (pathname?.includes('/dashboard/forms/')) ...`.

---

## 7. Casos edge

| Caso                                     | Comportamiento                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Template sin ítems                       | `ChecklistItemPicker` muestra mensaje "No hay ítems disponibles"; submit deshabilitado                   |
| Usuario cierra modal (ESC/X/click fuera) | Mismo que Cancel → redirect sin crear nada                                                               |
| Submit falla                             | Toast destructivo, modal queda abierto, botones re-habilitados                                           |
| Doble click en submit                    | Botón deshabilitado durante `isSubmitting` (cubierto por estado loading)                                 |
| `checklistAnswerId` inválido             | Server action retorna `{ ok: false, error }`, toast destructivo                                          |
| Usuario cierra pestaña durante submit    | Si la transacción alcanzó a commitear, los datos quedan. Si falló a mitad, rollback automático de Prisma |
| Usuario no selecciona supervisor         | Botón submit deshabilitado + mensaje inline si intenta                                                   |
| Usuario selecciona 0 ítems               | Botón submit deshabilitado                                                                               |

---

## 8. Rutas afectadas

El cambio vive enteramente en `NormalizedChecklistForm`, que se usa en:

- `/dashboard/forms/[id]/new` — checklist desde dashboard.
- `/maintenance/equipment/[id]/checklists/[checklistId]` — checklist desde mobile/QR.

Ambas heredan el nuevo comportamiento sin tocar sus `page.tsx`.

**Rutas readOnly no afectadas**: `/dashboard/forms/[id]/view`, `/dashboard/forms/[id]/view/[answerId]`.

---

## 9. Reglas del proyecto aplicadas

- **`vercel-react-best-practices`**: `useCallback` en handlers, `useMemo` en arrays derivados del template, NO `useEffect` para lógica de click, React Query con invalidación explícita.
- **`typescript-types.md`**: tipos inferidos con `Awaited<ReturnType<typeof ...>>`; sin `:any`.
- **`logger.md`**: Logger scoped en server action; sin `console.*`.
- **`forms.md`**: react-hook-form + zod para supervisor y comentarios con schema inline.
- **`server-actions.md`**: nueva action en `features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`, con `'use server'`.
- **`react-query.md`**: invalidación post-mutación, sin `useEffect + useState` para fetching.
- **`no-native-dialogs.md`**: uso exclusivo de `AlertDialog` y `Dialog` de shadcn.
- **`feature-structure.md`**: componentes en `shared/components/`, action en `SolicitudesMantenimiento/actions/`.

---

## 10. Qué NO cambia

- Schema Prisma — cero migraciones. Los modelos actuales soportan el caso.
- `CriticalDeviationsRepairModal` y su lógica — intactos.
- `CreateChecklistAnswer` — intacta.
- `createOrUpdateMaintenanceRequest` — intacta.
- `createMaintenanceRequestPendingApproval` — intacta.
- `NuevoPedidoChecklistForm` y `renderStep2Items` — intactos (extraemos a `ChecklistItemPicker` sin migrar NuevoPedido).
- `page.tsx` de las rutas afectadas — intactos.
- Flujo del branch `failedItems.length > 0` — intacto.

---

## 11. Resumen final

El flujo "checklist 100% OK" gana un paso opcional: tras guardar, se pregunta al usuario si quiere registrar un desvío. Si dice sí, un modal le deja elegir sección→ítem con checkboxes, comentar por ítem, elegir supervisor, y disparar el mismo tipo de `maintenance_request` (status `pending_approval`) que el flujo crítico genera hoy. Todos los defaults (criticidad heredada del template, una request con N items, vinculación al `checklist_answer_id`) clonan el flujo existente.
