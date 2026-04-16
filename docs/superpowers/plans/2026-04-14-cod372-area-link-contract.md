# COD-372 — Plan de implementación: vincular Área a Contrato

**Spec**: [2026-04-14-cod372-area-link-contract-design.md](../specs/2026-04-14-cod372-area-link-contract-design.md)
**Branch**: `feat/cod-372-area-link-contract` (base `dev`)
**PR**: target `dev`

---

## Orden de ejecución

Las tareas se pueden ejecutar de forma mayormente secuencial. Task 5 depende de 1–4. Tasks 1–4 pueden repartirse entre subagentes paralelos si conviene, pero son pequeñas y probablemente más rápido hacerlas en secuencia.

---

## Task 1 — Agregar server actions en `create.tsx`

**Archivo**: `src/features/Empresa/Clientes/actions/create.tsx`

**Acciones**:

### 1.1 Agregar `fetchActiveContractsByCustomer`

```ts
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

### 1.2 Agregar `fetchAreaLinkedContracts`

```ts
export async function fetchAreaLinkedContracts(areaId: string): Promise<string[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('service_areas').select('service_id').eq('area_id', areaId);

  if (error) {
    console.error('Error al cargar vínculos existentes del área', error);
    return [];
  }
  return (data ?? []).map((r) => r.service_id);
}
```

### 1.3 Agregar `linkAreaToContracts`

```ts
export async function linkAreaToContracts(
  areaId: string,
  serviceIds: string[]
): Promise<{ ok: true; linked: number } | { ok: false; error: string }> {
  if (!areaId || serviceIds.length === 0) {
    return { ok: false, error: 'Faltan datos para vincular' };
  }

  const supabase = await supabaseServer();

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
    return { ok: true, linked: 0 };
  }

  const { error: insertErr } = await supabase.from('service_areas').insert(toInsert as any);

  if (insertErr) {
    console.error('Error al vincular área a contratos', insertErr);
    return { ok: false, error: 'Error al guardar los vínculos' };
  }

  return { ok: true, linked: toInsert.length };
}
```

### 1.4 Extender retorno de `createArea` y `updateArea` con `data.areaId`

En `createArea`, cambiar:

```ts
return { status: 200, body: 'Area creada satisfactoriamente' };
```

por:

```ts
return {
  status: 200,
  body: 'Area creada satisfactoriamente',
  data: { areaId },
};
```

En `updateArea`, cambiar:

```ts
return { status: 200, body: 'Area actualizada satisfactoriamente' };
```

por:

```ts
return {
  status: 200,
  body: 'Area actualizada satisfactoriamente',
  data: { areaId: values.id },
};
```

**Verificación**:

- `npm run check-types` limpio
- Los tipos retorno siguen compatibles con los consumidores actuales (que solo leen `status`/`body`).

---

## Task 2 — Crear `LinkAreaToContractsPromptDialog.tsx`

**Archivo**: `src/features/Empresa/Clientes/components/area_clientes/LinkAreaToContractsPromptDialog.tsx`

**Contenido**:

```tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link2 } from 'lucide-react';
import { useRef } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaName: string;
  customerName: string;
  onConfirm: () => void;
  onLater: () => void;
};

export function LinkAreaToContractsPromptDialog({
  open,
  onOpenChange,
  areaName,
  customerName,
  onConfirm,
  onLater,
}: Props) {
  const actionTakenRef = useRef(false);

  const handleLaterClick = () => {
    actionTakenRef.current = true;
    onLater();
  };

  const handleConfirmClick = () => {
    actionTakenRef.current = true;
    onConfirm();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      actionTakenRef.current = false;
      onOpenChange(nextOpen);
      return;
    }
    onOpenChange(nextOpen);
    if (!actionTakenRef.current) {
      onLater();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-1">
              <AlertDialogTitle>Vincular área a contrato</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Querés vincular el área <strong>«{areaName}»</strong> a algún contrato de{' '}
                <strong>{customerName}</strong>?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLaterClick}>Más tarde</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClick}>Sí, vincular</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Verificación**:

- `npm run check-types` limpio.
- Visual: icono y layout similar al `AllGoodDeviationPromptDialog` corregido en COD-374.

---

## Task 3 — Crear `LinkAreaToContractsDialog.tsx`

**Archivo**: `src/features/Empresa/Clientes/components/area_clientes/LinkAreaToContractsDialog.tsx`

**Contenido**:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchActiveContractsByCustomer,
  fetchAreaLinkedContracts,
  linkAreaToContracts,
} from '@/features/Empresa/Clientes/actions/create';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileX, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: string;
  areaName: string;
  customerId: string;
  customerName: string;
  onDone: () => void;
};

export function LinkAreaToContractsDialog({
  open,
  onOpenChange,
  areaId,
  areaName,
  customerId,
  customerName,
  onDone,
}: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const contractsQuery = useQuery({
    queryKey: ['active-contracts-by-customer', customerId],
    queryFn: () => fetchActiveContractsByCustomer(customerId),
    enabled: open && !!customerId,
    staleTime: 2 * 60 * 1000,
  });

  const linkedQuery = useQuery({
    queryKey: ['area-linked-contracts', areaId],
    queryFn: () => fetchAreaLinkedContracts(areaId),
    enabled: open && !!areaId,
    staleTime: 2 * 60 * 1000,
  });

  const availableContracts = useMemo(() => {
    const all = contractsQuery.data ?? [];
    const linked = new Set(linkedQuery.data ?? []);
    return all.filter((c) => !linked.has(c.id));
  }, [contractsQuery.data, linkedQuery.data]);

  const mutation = useMutation({
    mutationFn: () => linkAreaToContracts(areaId, selected),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(
          res.linked === 0
            ? 'El área ya estaba vinculada a los contratos seleccionados'
            : `Área vinculada a ${res.linked} contrato${res.linked === 1 ? '' : 's'}`
        );
        qc.invalidateQueries({ queryKey: ['active-contracts-by-customer', customerId] });
        qc.invalidateQueries({ queryKey: ['area-linked-contracts', areaId] });
        setSelected([]);
        onOpenChange(false);
        onDone();
      } else {
        toast.error(res.error);
      }
    },
    onError: () => toast.error('Error inesperado al vincular'),
  });

  const isLoading = contractsQuery.isLoading || linkedQuery.isLoading;
  const isEmpty = !isLoading && availableContracts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular área «{areaName}»</DialogTitle>
          <DialogDescription>Cliente: {customerName}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <FileX className="h-10 w-10 opacity-50" aria-hidden="true" />
              <p>Este cliente no tiene contratos activos disponibles para vincular.</p>
            </div>
          )}

          {!isLoading && !isEmpty && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Contratos activos</label>
              <MultiSelectCombobox
                options={availableContracts.map((c) => ({
                  label: `${c.contract_number ?? 'Sin número'} — ${c.service_name ?? 'Sin nombre'}`,
                  value: c.id,
                }))}
                selectedValues={selected}
                onChange={setSelected}
                emptyMessage="Sin contratos activos"
                placeholder="Seleccionar contratos"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {isEmpty ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button
                variant="gh_orange"
                onClick={() => mutation.mutate()}
                disabled={selected.length === 0 || mutation.isPending || isLoading}
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Vincular
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Verificación**:

- Verificar que `MultiSelectCombobox` tiene esa API (props `options`, `selectedValues`, `onChange`, `emptyMessage`, `placeholder`) — confirmado en `areaForm.tsx:204`.
- Verificar que `Button` tiene `variant="gh_orange"` — confirmado en `areaForm.tsx:221`.
- `npm run check-types` limpio.

---

## Task 4 — Modificar `areaForm.tsx` para integrar el flujo

**Archivo**: `src/features/Empresa/Clientes/components/area_clientes/areaForm.tsx`

### 4.1 Imports nuevos

```tsx
import { useState } from 'react'; // ya existe
import { LinkAreaToContractsPromptDialog } from './LinkAreaToContractsPromptDialog';
import { LinkAreaToContractsDialog } from './LinkAreaToContractsDialog';
```

### 4.2 Estados nuevos dentro del componente

```tsx
const [promptOpen, setPromptOpen] = useState(false);
const [linkDialogOpen, setLinkDialogOpen] = useState(false);
const [pendingLink, setPendingLink] = useState<{
  areaId: string;
  areaName: string;
  customerId: string;
  customerName: string;
} | null>(null);
```

### 4.3 Extraer helper `finishFormReset`

Dentro del componente, antes de `handleSubmit`:

```tsx
const finishFormReset = () => {
  reset();
  setSelectedArea(null);
  setMode('create');
  setPendingLink(null);
  router.refresh();
};
```

### 4.4 Refactor `handleSubmit` — abrir prompt después de éxito

Cambiar:

```tsx
if (response.status === 200) {
  toast.success(response.body || 'Área actualizada correctamente');
  reset();
  setSelectedArea(null);
  setMode('create');
  router.refresh();
}
```

por:

```tsx
if (response.status === 200) {
  toast.success(response.body || 'Área actualizada correctamente');
  const areaId = response.data?.areaId;
  const customerName = customers.find((c) => c.id === values.customer_id)?.name ?? 'Cliente';
  if (areaId) {
    setPendingLink({
      areaId,
      areaName: values.name,
      customerId: values.customer_id,
      customerName,
    });
    setPromptOpen(true);
  } else {
    finishFormReset();
  }
}
```

Hacer el mismo cambio en la rama de `createArea` (modo 'create').

### 4.5 Handlers del prompt

```tsx
const handlePromptConfirm = () => {
  setPromptOpen(false);
  setLinkDialogOpen(true);
};

const handlePromptLater = () => {
  setPromptOpen(false);
  finishFormReset();
};

const handleLinkDialogDone = () => {
  setLinkDialogOpen(false);
  finishFormReset();
};
```

### 4.6 Renderizar los diálogos al final (dentro del PermissionGuard o fuera, da igual — los Dialogs son portales)

Antes del cierre del `</Form>`:

```tsx
{
  pendingLink && (
    <>
      <LinkAreaToContractsPromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        areaName={pendingLink.areaName}
        customerName={pendingLink.customerName}
        onConfirm={handlePromptConfirm}
        onLater={handlePromptLater}
      />
      <LinkAreaToContractsDialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open);
          if (!open) finishFormReset();
        }}
        areaId={pendingLink.areaId}
        areaName={pendingLink.areaName}
        customerId={pendingLink.customerId}
        customerName={pendingLink.customerName}
        onDone={handleLinkDialogDone}
      />
    </>
  );
}
```

**Nota sobre el onOpenChange del LinkDialog**: al cerrar el dialog (X, ESC, Cancelar) queremos igual hacer reset del form. El `onDone` solo se llama cuando la mutation tiene éxito. Ambos caminos deben resetear.

### 4.7 Cleanup

- Remover el `reset() + setSelectedArea(null) + setMode('create') + router.refresh()` que estaba inline.
- Mantener el `handleCancel` existente sin cambios.

**Verificación**:

- `npm run check-types` limpio.
- Revisar que el flujo de error (`response.status === 400/500`) sigue llamando a `toast.error` sin abrir el prompt.

---

## Task 5 — Verificación end-to-end (manual)

**Pre-requisitos**: `npm run dev` corriendo.

### 5.1 Escenarios a probar

1. **Crear área con cliente que tiene ≥2 contratos activos**

   - Llenar form, click "Crear" → aparece prompt con áreaName + customerName
   - Click "Sí, vincular" → dialog con lista de contratos
   - Seleccionar 2 → click "Vincular" → toast "Área vinculada a 2 contratos"
   - Verificar en tab Contratos que el área aparece vinculada en esos 2 contratos

2. **Crear área con cliente sin contratos activos**

   - Click "Crear" → prompt → "Sí, vincular"
   - Dialog muestra estado vacío + botón "Cerrar"

3. **"Más tarde"**

   - Click "Crear" → prompt → "Más tarde"
   - Form se resetea, tabla se refresca, no hay vínculo creado

4. **ESC en prompt**

   - Click "Crear" → prompt abierto → ESC
   - Equivalente a "Más tarde"

5. **Editar área**

   - Seleccionar área existente, click "Actualizar" → prompt → "Sí, vincular"
   - Dialog muestra solo contratos **no vinculados** aún
   - Vincular uno nuevo → verificar en tab Contratos

6. **Cancelar durante dialog de vínculo**

   - Crear → prompt "Sí" → dialog abierto → "Cancelar"
   - Form se resetea, no se crea ningún vínculo

7. **Tipos**
   - `npm run check-types` limpio

### 5.2 Agent-browser (opcional si dev server corre)

Correr `agent-browser-verify` sobre `/dashboard/company/actualCompany?tab=areas` para smoke test.

---

## Task 6 — Commit y PR

**NO commitear hasta aprobación explícita del usuario.**

Cuando el usuario apruebe:

```bash
npm run check-types
git add -A
git commit -m "feat(areas): vincular area a contrato al crear/editar (COD-372)

- Nuevo AlertDialog post-create/edit preguntando si vincular a contratos
- Nuevo Dialog con MultiSelect de contratos activos del cliente
- Server actions: fetchActiveContractsByCustomer, fetchAreaLinkedContracts, linkAreaToContracts
- createArea/updateArea ahora retornan data.areaId
- En edit: se muestran solo contratos aún no vinculados al area"
git push -u origin feat/cod-372-area-link-contract
gh pr create --base dev --title "feat(areas): vincular area a contrato al crear/editar (COD-372)" \
  --body "$(cat <<'EOF'
## Resumen
Al crear o editar un área, ahora se ofrece vincularla a uno o varios contratos activos del cliente sin tener que navegar al tab de Contratos.

## Flujo
1. Usuario guarda el área (crear o editar) con éxito
2. Aparece un AlertDialog: "¿Querés vincular esta área a algún contrato?"
3. Si acepta → Dialog con MultiSelect de contratos activos del cliente
4. Si no tiene contratos activos → estado vacío con botón Cerrar
5. Selecciona ≥1 contrato → Vincular → se crean filas en service_areas

## Archivos nuevos
- LinkAreaToContractsPromptDialog.tsx
- LinkAreaToContractsDialog.tsx

## Archivos modificados
- actions/create.tsx (3 acciones nuevas + extensión de retorno)
- areaForm.tsx (integración del flujo)

## Spec y plan
- docs/superpowers/specs/2026-04-14-cod372-area-link-contract-design.md
- docs/superpowers/plans/2026-04-14-cod372-area-link-contract.md

## Test plan
- [ ] Crear área con ≥2 contratos activos → vincular → verificar
- [ ] Crear área sin contratos activos → estado vacío
- [ ] "Más tarde" / ESC → no se crea vínculo
- [ ] Editar área → solo muestra contratos no vinculados
- [ ] check-types limpio
EOF
)"
```

---

## Notas de ejecución

- **SIN commits durante el plan** — user corrige solo al final
- **SIN referencias a Claude/IA** en commits ni PR
- **Incluir los .md de spec y plan** en el commit
- En caso de detectar inconsistencias durante la ejecución (ej: `MultiSelectCombobox` API distinta), pausar y consultar al usuario antes de improvisar
