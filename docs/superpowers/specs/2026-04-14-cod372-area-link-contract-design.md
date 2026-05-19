# COD-372 — Vincular Área a Contrato al crear/editar — Design Spec

**Linear**: [COD-372](https://linear.app/codecontrol-sas/issue/COD-372/al-crear-un-area-automaticamente-preguntar-si-se-quiere-vincular-a)
**Branch**: `feat/cod-372-area-link-contract` (base `dev`)
**Fecha**: 2026-04-14

---

## 1. Problema

Hoy, cuando un usuario crea un Área desde el tab **Empresa → Clientes → Áreas**, el Área queda huérfana: no se vincula a ningún contrato del cliente. El único lugar donde puede hacerse ese vínculo es desde el formulario de **Contratos (Servicios)** al crear/editar un servicio.

Esto obliga al usuario a:

1. Crear el Área
2. Navegar a tab Contratos
3. Editar el contrato deseado
4. Agregar el Área recién creada al contrato

El ticket pide automatizar ese flujo: **al crear (o editar) un Área, preguntar si se quiere vincular a algún contrato activo del cliente**; si acepta, mostrar un selector para elegir uno o varios contratos y guardar los vínculos.

---

## 2. Contexto técnico actual

### 2.1 Modelo de datos

```
customers (Clientes)
  └── 1:N ── customer_services (Contratos/Servicios)
  └── 1:N ── areas_cliente   (Áreas)

customer_services ──M:N── areas_cliente
                    │
               service_areas (pivot con PK compuesto: service_id + area_id + id)
```

- `service_areas` **NO tiene unique constraint en `(service_id, area_id)`** — el PK es compuesto con `id` incluido, lo que permite duplicados. Debemos evitar duplicados por código.
- Los contratos activos se identifican por `customer_services.is_active = true`.

### 2.2 Archivos involucrados

| Ruta                                                                  | Rol actual                                                     |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/features/Empresa/Clientes/components/area_clientes/areaForm.tsx` | Form create/edit Área (react-hook-form + zod)                  |
| `src/features/Empresa/Clientes/actions/create.tsx`                    | `createArea`, `updateArea`, `fetchAreasWithProvinces`, helpers |
| `src/features/Empresa/Clientes/components/customerTab.tsx`            | Contenedor del form + tabla                                    |
| Schema Prisma: `areas_cliente`, `service_areas`, `customer_services`  | Modelos involucrados                                           |

### 2.3 Estado actual del flujo

- `createArea` retorna `{ status: 200, body: 'Area creada…' }` en éxito.
- `updateArea` retorna `{ status: 200, body: 'Area actualizada…' }` en éxito.
- Al volver al form: `reset()` + `setMode('create')` + `router.refresh()` (para refrescar la tabla SSR).

---

## 3. Flujo UX propuesto

### 3.1 Diagrama

```
[Usuario guarda Área]
         ↓
[createArea / updateArea OK]
         ↓
[Toast "Área creada/actualizada"]
         ↓
[AlertDialog: "¿Querés vincular esta área a algún contrato de {customerName}?"]
    ├── "Más tarde" → cierra → reset + router.refresh() (flujo actual)
    └── "Sí, vincular" → cierra AlertDialog
                        ↓
                   [Dialog: "Vincular área '{areaName}'"]
                        ↓
                   [useQuery: fetchActiveContractsByCustomer(customerId)]
                        ├── isLoading → skeleton del MultiSelect
                        ├── data.length === 0 → estado vacío: "Este cliente no tiene contratos activos." + botón "Cerrar"
                        └── data.length ≥ 1 → MultiSelectCombobox con contratos
                                ↓
                           [Usuario selecciona ≥1 contrato + click "Vincular"]
                                ↓
                           [linkAreaToContracts(areaId, serviceIds)]
                                ↓
                           [Toast "Área vinculada a N contrato(s)"]
                                ↓
                           [Close + reset + router.refresh()]
```

### 3.2 Aplicabilidad

| Acción      | ¿Abre prompt?                                |
| ----------- | -------------------------------------------- |
| Crear Área  | SI — siempre (si el `customer_id` es válido) |
| Editar Área | SI — siempre (para agregar nuevos vínculos)  |

**Consideración para edición**: el diálogo solo permite **agregar** vínculos, no quitar los existentes. Quitar vínculos sigue siendo responsabilidad del form de Contratos. El MultiSelect mostrará los contratos **no vinculados aún** al área, o los mostrará todos con los ya vinculados pre-seleccionados y deshabilitados (ver §5.2).

### 3.3 Detalles visuales

- **AlertDialog prompt**: estilo alineado con el `AllGoodDeviationPromptDialog` de COD-374 — icon `Link2` o `Plus` a la izquierda del título, título + descripción, dos botones "Más tarde" (secundario) y "Sí, vincular" (primario gh_orange).
- **Dialog de vínculo**:
  - Header con título "Vincular área «{areaName}»" + subtítulo "Cliente: {customerName}"
  - Body: `MultiSelectCombobox` con label "Contratos activos del cliente"
  - Cada option: `{contract_number ?? 'Sin número'} — {service_name}`
  - Si no hay contratos: estado vacío con icono `FileX` + texto + botón "Cerrar"
  - Footer: botón "Cancelar" (ghost) + "Vincular" (primary, disabled si 0 seleccionados, con spinner durante submit)
- **Skeleton** para loading del MultiSelect (no spinners).

### 3.4 Patrón de cierre con `actionTakenRef`

Reutilizar el patrón del `AllGoodDeviationPromptDialog` (COD-374) para distinguir entre clicks explícitos y ESC/outside-click:

```tsx
const actionTakenRef = useRef(false);
const handleOpenChange = (open: boolean) => {
  if (open) {
    actionTakenRef.current = false;
    return;
  }
  if (!actionTakenRef.current) onLater(); // cerrar sin acción = "más tarde"
};
```

---

## 4. Componentes y archivos nuevos

### 4.1 `LinkAreaToContractsPromptDialog.tsx` (nuevo)

**Ruta**: `src/features/Empresa/Clientes/components/area_clientes/LinkAreaToContractsPromptDialog.tsx`

**Props**:

```ts
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaName: string;
  customerName: string;
  onConfirm: () => void; // "Sí, vincular"
  onLater: () => void; // "Más tarde" / ESC / outside
};
```

**Comportamiento**: AlertDialog shadcn, estilo idéntico al `AllGoodDeviationPromptDialog`. Icono `Link2` en la esquina superior izquierda junto al título.

### 4.2 `LinkAreaToContractsDialog.tsx` (nuevo)

**Ruta**: `src/features/Empresa/Clientes/components/area_clientes/LinkAreaToContractsDialog.tsx`

**Props**:

```ts
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: string;
  areaName: string;
  customerId: string;
  customerName: string;
  onDone: () => void; // se invoca tras vincular con éxito
};
```

**Comportamiento**:

- Al abrirse (`open=true`): `useQuery` para cargar contratos activos del cliente (`fetchActiveContractsByCustomer(customerId)`).
- Estado loading → skeleton del MultiSelectCombobox.
- Estado vacío → icon + texto "Este cliente no tiene contratos activos." + botón "Cerrar".
- Estado con contratos → MultiSelect + botón "Vincular".
- Submit → `useMutation` con `linkAreaToContracts(areaId, selectedIds)` → toast → close → `onDone()`.

### 4.3 Modificación de `areaForm.tsx`

Agregar tres estados:

```ts
const [promptOpen, setPromptOpen] = useState(false);
const [linkDialogOpen, setLinkDialogOpen] = useState(false);
const [pendingLink, setPendingLink] = useState<{
  areaId: string;
  areaName: string;
  customerId: string;
  customerName: string;
} | null>(null);
```

Handlers:

```ts
// Tras createArea/updateArea OK
const handleLinkPromptConfirm = () => {
  setPromptOpen(false);
  setLinkDialogOpen(true);
};
const handleLinkPromptLater = () => {
  setPromptOpen(false);
  finishFormReset(); // reset + router.refresh()
};
const handleLinkDialogDone = () => {
  setLinkDialogOpen(false);
  finishFormReset();
};
```

El `finishFormReset()` encapsula el `reset() + setSelectedArea(null) + setMode('create') + router.refresh()` actual (para que se ejecute tanto después de "Más tarde" como después de vincular con éxito).

---

## 5. Server actions nuevas

Se agregan al archivo existente `src/features/Empresa/Clientes/actions/create.tsx` (mantener consistencia con el resto de acciones de áreas).

### 5.1 `fetchActiveContractsByCustomer(customerId: string)`

```ts
'use server';

export async function fetchActiveContractsByCustomer(customerId: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('customer_services')
    .select('id, service_name, contract_number, service_start, service_validity')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .order('service_name', { ascending: true });

  if (error) {
    console.error('Error al cargar contratos del cliente', error);
    return [];
  }
  return data ?? [];
}

export type ActiveContract = Awaited<ReturnType<typeof fetchActiveContractsByCustomer>>[number];
```

**Nota**: Se mantiene el patrón legacy con Supabase (resto del archivo lo usa). No se migra a Prisma en este ticket — fuera de alcance.

### 5.2 `fetchAreaLinkedContracts(areaId: string)` (opcional — ver §8)

Para edición: devolver los `service_id` ya vinculados a esa área, de modo que el MultiSelect pueda pre-seleccionar/deshabilitar esos contratos.

```ts
export async function fetchAreaLinkedContracts(areaId: string): Promise<string[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('service_areas').select('service_id').eq('area_id', areaId);

  if (error) return [];
  return (data ?? []).map((r) => r.service_id);
}
```

### 5.3 `linkAreaToContracts(areaId: string, serviceIds: string[])`

```ts
export async function linkAreaToContracts(
  areaId: string,
  serviceIds: string[]
): Promise<{ ok: true; linked: number } | { ok: false; error: string }> {
  if (!areaId || serviceIds.length === 0) {
    return { ok: false, error: 'Faltan datos para vincular' };
  }

  const supabase = await supabaseServer();

  // Evitar duplicados: consultar vínculos existentes
  const { data: existing, error: existingErr } = await supabase
    .from('service_areas')
    .select('service_id')
    .eq('area_id', areaId)
    .in('service_id', serviceIds);

  if (existingErr) {
    console.error('Error al verificar vínculos existentes', existingErr);
    return { ok: false, error: 'Error al verificar vínculos existentes' };
  }

  const existingIds = new Set((existing ?? []).map((r) => r.service_id));
  const toInsert = serviceIds
    .filter((id) => !existingIds.has(id))
    .map((service_id) => ({ service_id, area_id: areaId }));

  if (toInsert.length === 0) {
    return { ok: true, linked: 0 }; // ya estaban todos vinculados
  }

  const { error: insertErr } = await supabase.from('service_areas').insert(toInsert as any);

  if (insertErr) {
    console.error('Error al vincular área a contratos', insertErr);
    return { ok: false, error: 'Error al guardar los vínculos' };
  }

  return { ok: true, linked: toInsert.length };
}
```

### 5.4 Retornar `customer_id + customer_name + area_name` desde `createArea/updateArea`

Para que el form sepa a qué cliente llamar sin refetchear, extender el retorno:

```ts
// createArea
return {
  status: 200,
  body: 'Area creada satisfactoriamente',
  data: {
    areaId: areaId,
    areaName: values.name,
    customerId: values.customer_id,
    customerName: /* traer del select de customers que ya tenemos en el form */,
  },
};
```

El form tiene la lista `customers` prop → busca `customers.find(c => c.id === values.customer_id)?.name` para obtener el nombre. No hace falta query adicional en el server.

---

## 6. Lista de archivos a crear / modificar

### Nuevos

1. `src/features/Empresa/Clientes/components/area_clientes/LinkAreaToContractsPromptDialog.tsx`
2. `src/features/Empresa/Clientes/components/area_clientes/LinkAreaToContractsDialog.tsx`

### Modificados

3. `src/features/Empresa/Clientes/actions/create.tsx`

   - Agregar `fetchActiveContractsByCustomer`
   - Agregar `fetchAreaLinkedContracts`
   - Agregar `linkAreaToContracts`
   - Extender retorno de `createArea` con `data.areaId`
   - Extender retorno de `updateArea` con `data.areaId`

4. `src/features/Empresa/Clientes/components/area_clientes/areaForm.tsx`
   - Agregar estados `promptOpen`, `linkDialogOpen`, `pendingLink`
   - Refactor del flujo post-success
   - Agregar `finishFormReset()` helper
   - Renderizar `<LinkAreaToContractsPromptDialog>` y `<LinkAreaToContractsDialog>`

### Sin cambios

- `customerTab.tsx` — nada que tocar
- Schema Prisma — nada que migrar (no hay cambios DB)
- Permisos — no hay tab nueva

---

## 7. React Query — queries nuevas

```ts
// useQuery en LinkAreaToContractsDialog
useQuery({
  queryKey: ['active-contracts-by-customer', customerId],
  queryFn: () => fetchActiveContractsByCustomer(customerId),
  enabled: open && !!customerId,
  staleTime: 2 * 60 * 1000,
});

// useQuery adicional si optamos por 5.2 (pre-selección en edit)
useQuery({
  queryKey: ['area-linked-contracts', areaId],
  queryFn: () => fetchAreaLinkedContracts(areaId),
  enabled: open && !!areaId,
  staleTime: 2 * 60 * 1000,
});
```

`useMutation` para `linkAreaToContracts`:

```ts
const qc = useQueryClient();
const mutation = useMutation({
  mutationFn: () => linkAreaToContracts(areaId, selectedIds),
  onSuccess: (res) => {
    if (res.ok) {
      toast.success(`Vinculado a ${res.linked} contrato(s)`);
      qc.invalidateQueries({ queryKey: ['active-contracts-by-customer', customerId] });
      qc.invalidateQueries({ queryKey: ['area-linked-contracts', areaId] });
      onDone();
    } else {
      toast.error(res.error);
    }
  },
});
```

---

## 8. Decisiones abiertas (documentadas)

### 8.1 Pre-seleccionar contratos ya vinculados en modo edit

**Opción A (más simple)**: El MultiSelect solo muestra contratos **no vinculados** aún (filtrar en cliente usando la query de `fetchAreaLinkedContracts`). El usuario solo ve contratos que puede agregar.

**Opción B**: El MultiSelect muestra todos los contratos activos, con los ya vinculados **pre-seleccionados y deshabilitados** (con badge "Ya vinculado"). El submit solo envía los nuevos.

**Recomendación**: **Opción A**. Evita confusión visual y simplifica el componente. Si el usuario quiere ver qué está vinculado, ya existe el tab Contratos.

### 8.2 Qué hacer si el usuario no eligió `customer_id` aún al abrir el form

El form **requiere** `customer_id` para guardar (zod `.min(1)`). El prompt solo se abre **después** del submit exitoso, por lo que siempre hay `customer_id`. No hay edge case.

### 8.3 ¿Invalidar la cache de Contratos tras vincular?

Los contratos en pantalla (tab Contratos) pueden tener queries de React Query. Si las hay, invalidar:

```ts
qc.invalidateQueries({ queryKey: ['customer-services'] });
```

Revisar durante ejecución si existe esa query key y agregar invalidation si aplica.

---

## 9. Edge cases

| Edge case                                             | Manejo                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cliente sin contratos activos                         | Dialog muestra estado vacío: "Este cliente no tiene contratos activos." + botón "Cerrar" |
| Cliente con todos los contratos ya vinculados al área | (Opción A) MultiSelect vacío → mismo tratamiento que estado vacío                        |
| Usuario cierra con ESC sin clickear botones           | Se considera "Más tarde" (gracias al `actionTakenRef`)                                   |
| Selecciona 0 contratos y click "Vincular"             | Botón deshabilitado mientras `selectedIds.length === 0`                                  |
| `linkAreaToContracts` retorna `{ ok: false }`         | Toast error, dialog queda abierto para reintentar                                        |
| Error de red al cargar contratos                      | `isError` state → mensaje "Error al cargar contratos" + botón "Reintentar"               |

---

## 10. Plan de rollback

Si el flujo genera bugs en producción:

1. **Rollback rápido en UI**: comentar la apertura del `promptOpen` en `areaForm.tsx` dentro del handler de `createArea/updateArea` success (3 líneas). El flujo vuelve al original (`reset + router.refresh`).
2. Las acciones server `fetchActiveContractsByCustomer`, `fetchAreaLinkedContracts`, `linkAreaToContracts` quedan disponibles pero no se invocan.
3. Los componentes nuevos `LinkAreaToContractsPromptDialog.tsx` y `LinkAreaToContractsDialog.tsx` quedan en el código pero no renderizados.

Ninguna migración de DB → rollback = solo revertir archivos de UI.

---

## 11. Fuera de alcance (explícito)

- ❌ Migrar `createArea/updateArea` de Supabase a Prisma (fuera de scope, archivo legacy)
- ❌ Permitir **eliminar** vínculos desde el flujo de Área (sigue siendo desde tab Contratos)
- ❌ Modificar el form de Contratos/Servicios
- ❌ Cambiar validaciones del schema del Área
- ❌ Agregar nueva tab / cambios en permisos

---

## 12. Verificación / Test plan

Manual:

1. Crear nueva área con cliente que tiene ≥2 contratos activos → prompt aparece → "Sí, vincular" → seleccionar 2 → ver toast → refrescar → tab Contratos muestra área en los 2 contratos ✓
2. Crear área con cliente sin contratos activos → prompt aparece → "Sí, vincular" → dialog muestra estado vacío ✓
3. Crear área → prompt "Más tarde" → no se crea ningún vínculo ✓
4. Crear área → ESC en prompt → equivalente a "Más tarde" ✓
5. Editar área existente (con 1 contrato ya vinculado) → prompt → dialog muestra solo los contratos **no** vinculados (Opción A) ✓
6. Editar área cambiando cliente → flujo debe seguir funcionando (el `updateArea` actualiza `customer_id`, el prompt usa el nuevo `customer_id`) — validar también que la validación existente de `isAreaUsedInContracts` siga funcionando
7. `npm run check-types` limpio

Automatizado: N/A (no hay tests unitarios/e2e de áreas en el repo).

---

## 13. Referencias

- Patrón de prompt dialog: `src/features/Mantenimiento/shared/components/AllGoodDeviationPromptDialog.tsx` (COD-374)
- `MultiSelectCombobox`: `src/components/ui/multi-select-combobox.tsx`
- Ejemplo de insert en `service_areas`: `src/features/Empresa/Clientes/actions/services.ts:79`
