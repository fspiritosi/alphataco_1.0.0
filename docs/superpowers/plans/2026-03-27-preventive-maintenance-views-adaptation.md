# Preventive Maintenance Views Adaptation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt all modals and table columns in the Operaciones and Taller tabs so that preventive maintenance orders (source='preventive', 0 items) display meaningful info instead of empty item lists.

**Architecture:** Two shared components (`PreventiveInfoCard`, `PreventiveItemsBadge`) used consistently across 7 column files, 7 modals, and 1 OrderDetailDialog. Server actions patched to include `preventive_type` where missing. Approval extended with `preventiveApproval` flag; rejection uses server-side heuristic (`itemIds.length === 0` + `source === 'preventive'`).

**Tech Stack:** Next.js 16, React 19, Prisma ORM, shadcn/ui, Tailwind CSS, Lucide icons, moment.js

**Spec:** `docs/superpowers/specs/2026-03-27-preventive-maintenance-views-adaptation-design.md`

---

## File Map

### New files (2)

- `src/features/Mantenimiento/components/PreventiveInfoCard.tsx` — Reusable card for modals
- `src/features/Mantenimiento/components/PreventiveItemsBadge.tsx` — Reusable badge+tooltip for table columns

### Server action patches (3 need changes, 4 already OK)

- Modify: `src/features/Mantenimiento/PendientesEjecutar/actions.server.ts` — Add `preventive_type` to select
- Modify: `src/features/Mantenimiento/Operaciones/ParaTaller/actions.server.ts` — Add `preventive_type` to select
- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/actions.server.ts` — Add `preventive_type` to select
- Already OK: `SolicitudesMantenimiento/actions/actionsServer.ts` — `MAINTENANCE_REQUEST_FULL_SELECT` already has `source` + `preventive_type`
- Already OK: `SolicitudesMantenimiento/actions/actionsTableServer.ts` — paginated query already has both fields
- Already OK: `MaintenanceOrders/actions/actionsServer.ts` — `getMaintenanceOrderDetail` already has both fields
- Already OK: `PedidosMantenimiento/Pendientes/actions.server.ts` — `PENDING_ORDER_SELECT` already has `source` + `preventive_type`

### Approval/rejection server action + types (2)

- `src/features/Mantenimiento/types/index.ts` — Extend `ApproveRequestItemsInput`
- `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` — Add preventive branch in approve + reject

### Column files (7)

- `src/features/Mantenimiento/SolicitudesMantenimiento/components/columns.tsx`
- `src/features/Mantenimiento/PendientesEjecutar/columns.tsx`
- `src/features/Mantenimiento/Operaciones/ParaTaller/columns.tsx`
- `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/columns.tsx`
- `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/components/columns.tsx` (legacy)
- `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/columns.tsx`
- `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/components/columns.tsx` (legacy)

### Modal files (8)

- `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudApprovalDialog.tsx`
- `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudRejectDialog.tsx`
- `src/features/Mantenimiento/PendientesEjecutar/components/PendienteDetailDialog.tsx`
- `src/features/Mantenimiento/PendientesEjecutar/components/AprobarFechaDialog.tsx`
- `src/features/Mantenimiento/PendientesEjecutar/components/RechazarFechaDialog.tsx`
- `src/features/Mantenimiento/PedidosMantenimiento/components/PlanificarPedidoDialog.tsx`
- `src/features/Mantenimiento/PedidosMantenimiento/components/EntradaTallerDialog.tsx`
- `src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx`

---

## Task 1: Shared Components

**Files:**

- Create: `src/features/Mantenimiento/components/PreventiveInfoCard.tsx`
- Create: `src/features/Mantenimiento/components/PreventiveItemsBadge.tsx`

- [ ] **Step 1: Create PreventiveInfoCard**

Create `src/features/Mantenimiento/components/PreventiveInfoCard.tsx`:

```tsx
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';

interface PreventiveInfoCardProps {
  preventiveType: string;
  className?: string;
  showDescription?: boolean;
}

export function PreventiveInfoCard({ preventiveType, className, showDescription = true }: PreventiveInfoCardProps) {
  const typeKey = preventiveType as PreventiveType;
  const label = PREVENTIVE_TYPES[typeKey] ?? preventiveType;
  const description = PREVENTIVE_TYPE_DESCRIPTIONS[typeKey];
  const Icon = PREVENTIVE_TYPE_ICONS[typeKey];

  return (
    <div className={`space-y-2 p-4 bg-muted/50 rounded-lg ${className ?? ''}`}>
      <h4 className="font-medium text-sm flex items-center gap-1.5">
        <Shield className="h-4 w-4" />
        Mantenimiento Preventivo
      </h4>
      <Badge variant="secondary" className="gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Badge>
      {showDescription && description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create PreventiveItemsBadge**

Create `src/features/Mantenimiento/components/PreventiveItemsBadge.tsx`:

```tsx
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';

interface PreventiveItemsBadgeProps {
  preventiveType: string;
}

export function PreventiveItemsBadge({ preventiveType }: PreventiveItemsBadgeProps) {
  const typeKey = preventiveType as PreventiveType;
  const label = PREVENTIVE_TYPES[typeKey] ?? preventiveType;
  const description = PREVENTIVE_TYPE_DESCRIPTIONS[typeKey];
  const Icon = PREVENTIVE_TYPE_ICONS[typeKey];

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 cursor-default">
            <Shield className="h-3 w-3" />
            Preventivo
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold text-sm">Mantenimiento Preventivo</p>
            <p className="text-sm flex items-center gap-1">
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 2: Server Action Patches — Add `preventive_type` to Missing Queries

**Files:**

- Modify: `src/features/Mantenimiento/PendientesEjecutar/actions.server.ts`
- Modify: `src/features/Mantenimiento/Operaciones/ParaTaller/actions.server.ts`
- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/actions.server.ts`

- [ ] **Step 1: PendientesEjecutar — Add `preventive_type` to `PENDING_EXECUTION_SELECT`**

In `src/features/Mantenimiento/PendientesEjecutar/actions.server.ts`, find the `maintenance_requests` sub-select inside `PENDING_EXECUTION_SELECT`. It currently has `source: true` but is missing `preventive_type`. Add it right after `source: true`:

```typescript
// Inside PENDING_EXECUTION_SELECT > maintenance_requests > select:
source: true,
preventive_type: true,  // ADD THIS LINE
```

- [ ] **Step 2: ParaTaller — Add `preventive_type` to `FOR_WORKSHOP_SELECT`**

In `src/features/Mantenimiento/Operaciones/ParaTaller/actions.server.ts`, find the `maintenance_requests` sub-select inside `FOR_WORKSHOP_SELECT`. Add `preventive_type: true` right after `source: true`:

```typescript
// Inside FOR_WORKSHOP_SELECT > maintenance_requests > select:
source: true,
preventive_type: true,  // ADD THIS LINE
```

- [ ] **Step 3: Confirmados — Add `preventive_type` to `CONFIRMED_ORDERS_SELECT`**

In `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/actions.server.ts`, add `preventive_type: true` in TWO places:

At the order level (after `source: true`):

```typescript
source: true,
preventive_type: true,  // ADD THIS LINE
```

And inside the `maintenance_requests` sub-select (after `source: true`):

```typescript
// Inside CONFIRMED_ORDERS_SELECT > maintenance_requests > select:
source: true,
preventive_type: true,  // ADD THIS LINE
```

- [ ] **Step 4: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 3: Extend Approval/Rejection for Preventive Requests

> **Design decision — rejection strategy:** The approval flow uses an explicit `preventiveApproval` flag on the input type. The rejection flow does NOT use a flag — instead, the server action detects the preventive case by checking `itemIds.length === 0` + `request.source === 'preventive'`. This avoids extending a second type and is safe because non-preventive requests always have items to reject.

**Files:**

- Modify: `src/features/Mantenimiento/types/index.ts`
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`

- [ ] **Step 1: Extend `ApproveRequestItemsInput` type**

In `src/features/Mantenimiento/types/index.ts`, add two optional fields to `ApproveRequestItemsInput`:

```typescript
export interface ApproveRequestItemsInput {
  requestId: string;
  approvedItems: {
    itemId: string;
    validatorComment?: string;
  }[];
  rejectedItems: {
    itemId: string;
    reason: string;
    validatorComment?: string;
  }[];
  preventiveApproval?: boolean; // ADD — approves entire preventive request
  validatorComment?: string; // ADD — comment for preventive approval
}
```

- [ ] **Step 2: Add preventive branch to `approveMaintenanceRequestItems`**

In `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`, inside `approveMaintenanceRequestItems`, add a preventive branch BEFORE the existing item-by-item approval logic (right after `requireServerAuthProfile()`):

```typescript
// --- PREVENTIVE APPROVAL BRANCH ---
if (input.preventiveApproval) {
  const request = await prisma.maintenance_requests.findUniqueOrThrow({
    where: { id: input.requestId },
    select: { equipment_id: true, kilometer: true, engine_hours: true, source: true, preventive_type: true },
  });

  await prisma.$transaction(async (tx) => {
    // Update request status to approved
    await tx.maintenance_requests.update({
      where: { id: input.requestId },
      data: {
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date(),
      },
    });

    // Create maintenance order (same as existing flow but with preventive fields)
    await tx.maintenance_orders.create({
      data: {
        maintenance_request_id: input.requestId,
        equipment_id: request.equipment_id,
        status: 'pending_scheduling',
        kilometer_at_entry: request.kilometer ?? null,
        source: request.source,
        preventive_type: request.preventive_type,
      },
    });

    // Activity log
    await tx.maintenance_activity_log.create({
      data: {
        maintenance_request_id: input.requestId,
        action_type: 'approved',
        performed_by: profile.id,
        notes: input.validatorComment || 'Solicitud preventiva aprobada',
        metadata: { source: 'preventive', preventive_type: request.preventive_type },
      },
    });
  });

  await invalidateCacheTags(INVALIDATION_MAP.approveMaintenanceRequestItems);
  return;
}
// --- END PREVENTIVE BRANCH ---

// ... existing item-by-item code remains unchanged below ...
```

- [ ] **Step 3: Add preventive branch to `rejectMaintenanceRequestItems`**

In the same file, inside `rejectMaintenanceRequestItems`, add a preventive branch BEFORE the existing item rejection logic:

```typescript
// --- PREVENTIVE REJECTION BRANCH ---
if (input.itemIds.length === 0 && input.reason) {
  // Preventive rejection — reject the entire request (no items to iterate)
  const request = await prisma.maintenance_requests.findUniqueOrThrow({
    where: { id: input.requestId },
    select: { source: true, preventive_type: true },
  });

  if (request.source === 'preventive') {
    await prisma.$transaction(async (tx) => {
      await tx.maintenance_requests.update({
        where: { id: input.requestId },
        data: { status: 'rejected' },
      });

      await tx.maintenance_activity_log.create({
        data: {
          maintenance_request_id: input.requestId,
          action_type: 'rejected',
          performed_by: profile.id,
          notes: input.reason,
          metadata: { source: 'preventive', preventive_type: request.preventive_type },
        },
      });
    });

    await invalidateCacheTags(INVALIDATION_MAP.rejectMaintenanceRequestItems);
    return;
  }
}
// --- END PREVENTIVE BRANCH ---

// ... existing item-by-item rejection code remains unchanged below ...
```

- [ ] **Step 4: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 4: Table Columns — Operaciones Tab (3 files)

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/components/columns.tsx`
- Modify: `src/features/Mantenimiento/PendientesEjecutar/columns.tsx`
- Modify: `src/features/Mantenimiento/Operaciones/ParaTaller/columns.tsx`

- [ ] **Step 1: SolicitudesMantenimiento Items column**

In `src/features/Mantenimiento/SolicitudesMantenimiento/components/columns.tsx`, add the import at the top:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the Items column cell from:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_request_items || [];
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'desvío' : 'desvíos'}
    </Badge>
  );
},
```

To:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_request_items || [];
  if (items.length === 0 && row.original.source === 'preventive') {
    return <PreventiveItemsBadge preventiveType={row.original.preventive_type ?? ''} />;
  }
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'desvío' : 'desvíos'}
    </Badge>
  );
},
```

- [ ] **Step 2: PendientesEjecutar Items column**

In `src/features/Mantenimiento/PendientesEjecutar/columns.tsx`, add the import:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the `items_count` column cell from:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_order_items || [];
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

To:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_order_items || [];
  if (items.length === 0 && row.original.maintenance_requests?.source === 'preventive') {
    return (
      <PreventiveItemsBadge
        preventiveType={row.original.maintenance_requests?.preventive_type ?? ''}
      />
    );
  }
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

- [ ] **Step 3: ParaTaller Items column**

In `src/features/Mantenimiento/Operaciones/ParaTaller/columns.tsx`, add the import:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the `items_count` column cell from:

```tsx
cell: ({ row }) => {
  const count = row.original.maintenance_order_items?.length ?? 0;
  return (
    <Badge variant="secondary">
      {count} {count === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

To:

```tsx
cell: ({ row }) => {
  const count = row.original.maintenance_order_items?.length ?? 0;
  if (count === 0 && row.original.maintenance_requests?.source === 'preventive') {
    return (
      <PreventiveItemsBadge
        preventiveType={row.original.maintenance_requests?.preventive_type ?? ''}
      />
    );
  }
  return (
    <Badge variant="secondary">
      {count} {count === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

- [ ] **Step 4: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 5: Table Columns — Taller Tab (4 files)

**Files:**

- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/columns.tsx`
- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/components/columns.tsx`
- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/columns.tsx`
- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/components/columns.tsx`

- [ ] **Step 1: Pendientes active columns — Replace badge with PreventiveItemsBadge**

In `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/columns.tsx`, add the import:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the existing preventive badge block in the items column cell from:

```tsx
if (count === 0 && row.original.source === 'preventive') {
  return (
    <Badge variant="outline" className="gap-1">
      <Shield className="h-3 w-3" />
      Preventivo
    </Badge>
  );
}
```

To:

```tsx
if (count === 0 && row.original.source === 'preventive') {
  return <PreventiveItemsBadge preventiveType={row.original.preventive_type ?? ''} />;
}
```

Remove the `Shield` import if it's no longer used elsewhere in the file.

- [ ] **Step 2: Pendientes legacy columns — Add PreventiveItemsBadge**

In `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/components/columns.tsx`, add the import:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the Items column cell from:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_order_items || [];
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

To:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_order_items || [];
  if (items.length === 0 && row.original.source === 'preventive') {
    return <PreventiveItemsBadge preventiveType={row.original.preventive_type ?? ''} />;
  }
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

- [ ] **Step 3: Confirmados active columns — Replace badge with PreventiveItemsBadge**

In `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/columns.tsx`, add the import:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the existing preventive badge block in the items column cell from:

```tsx
if (items.length === 0 && row.original.maintenance_requests?.source === 'preventive') {
  return (
    <Badge variant="outline" className="gap-1">
      <Shield className="h-3 w-3" />
      Preventivo
    </Badge>
  );
}
```

To:

```tsx
if (items.length === 0 && row.original.maintenance_requests?.source === 'preventive') {
  return (
    <PreventiveItemsBadge
      preventiveType={row.original.preventive_type ?? row.original.maintenance_requests?.preventive_type ?? ''}
    />
  );
}
```

Remove the `Shield` import if it's no longer used elsewhere in the file.

- [ ] **Step 4: Confirmados legacy columns — Add PreventiveItemsBadge**

In `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/components/columns.tsx`, add the import:

```typescript
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
```

Replace the Items column cell from:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_order_items || [];
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

To:

```tsx
cell: ({ row }) => {
  const items = row.original.maintenance_order_items || [];
  if (items.length === 0 && row.original.maintenance_requests?.source === 'preventive') {
    return (
      <PreventiveItemsBadge
        preventiveType={row.original.maintenance_requests?.preventive_type ?? ''}
      />
    );
  }
  return (
    <Badge variant="secondary">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </Badge>
  );
},
```

- [ ] **Step 5: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 6: SolicitudApprovalDialog — Preventive Branch

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudApprovalDialog.tsx`

- [ ] **Step 1: Add imports**

Add at the top of the file:

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

- [ ] **Step 2: Add preventive state and detection**

Inside the component function, after the existing state declarations, add:

```typescript
const isPreventive = request.source === 'preventive';
const [preventiveAction, setPreventiveAction] = useState<'approve' | 'reject' | null>(null);
const [preventiveComment, setPreventiveComment] = useState('');
const [preventiveRejectionReason, setPreventiveRejectionReason] = useState('');
```

- [ ] **Step 3: Add preventive submit handler**

After the existing `handleSubmit` function, add:

```typescript
const handlePreventiveSubmit = async () => {
  try {
    if (preventiveAction === 'approve') {
      await approveMutation.mutateAsync({
        requestId: request.id,
        approvedItems: [],
        rejectedItems: [],
        preventiveApproval: true,
        validatorComment: preventiveComment.trim() || undefined,
      });
      toast.success('Solicitud preventiva aprobada');
    } else if (preventiveAction === 'reject') {
      await rejectMutation.mutateAsync({
        requestId: request.id,
        itemIds: [],
        reason: preventiveRejectionReason.trim(),
      });
      toast.success('Solicitud preventiva rechazada');
    }
    onClose();
  } catch (error) {
    toast.error('Error al procesar la solicitud');
  }
};
```

Note: You will need to also initialize `rejectMutation`:

```typescript
const rejectMutation = useRejectMaintenanceRequestItems();
```

Add the import for `useRejectMaintenanceRequestItems` at the top if not already present.

- [ ] **Step 4: Add preventive JSX branch**

In the JSX, wrap the existing items section (the critical items card + non-critical items card + summary bar) in a conditional. BEFORE that section, add the preventive branch:

```tsx
{
  isPreventive ? (
    <div className="space-y-4">
      <PreventiveInfoCard preventiveType={request.preventive_type ?? ''} />

      {/* Validator comment */}
      <div className="space-y-2">
        <Label>Comentario del validador (opcional)</Label>
        <Textarea
          value={preventiveComment}
          onChange={(e) => setPreventiveComment(e.target.value)}
          placeholder="Agregar un comentario..."
          rows={2}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        />
      </div>

      {/* Rejection reason (shown when rejecting) */}
      {preventiveAction === 'reject' && (
        <div className="space-y-2">
          <Label>Motivo del rechazo *</Label>
          <Textarea
            value={preventiveRejectionReason}
            onChange={(e) => setPreventiveRejectionReason(e.target.value)}
            placeholder="Ingrese el motivo del rechazo..."
            rows={3}
            disabled={rejectMutation.isPending}
          />
        </div>
      )}
    </div>
  ) : (
    <>
      {/* KEEP ALL existing JSX from this point to the <Separator /> before the summary bar.
        This includes: the criticalItems.length > 0 Card, the nonCriticalItems.length > 0 Card,
        the <Separator />, and the summary bar div. Copy them verbatim from the file — do NOT modify. */}
    </>
  );
}
```

- [ ] **Step 5: Replace footer for preventive**

Replace the `<DialogFooter>` with a conditional:

```tsx
<DialogFooter>
  {isPreventive ? (
    <>
      <Button variant="outline" onClick={onClose} disabled={approveMutation.isPending || rejectMutation.isPending}>
        Cancelar
      </Button>
      {preventiveAction === 'reject' ? (
        <Button
          variant="destructive"
          onClick={handlePreventiveSubmit}
          disabled={rejectMutation.isPending || !preventiveRejectionReason.trim()}
        >
          {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Rechazar Solicitud
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => setPreventiveAction('reject')}
            disabled={approveMutation.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
          <Button
            onClick={handlePreventiveSubmit}
            disabled={approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="mr-2 h-4 w-4" />
            Aprobar Solicitud
          </Button>
        </div>
      )}
    </>
  ) : (
    <>
      {/* EXISTING footer buttons unchanged */}
      <Button variant="outline" onClick={onClose} disabled={approveMutation.isPending}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit} disabled={approveMutation.isPending || pendingCount > 0}>
        {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Procesar Solicitud
      </Button>
    </>
  )}
</DialogFooter>
```

- [ ] **Step 6: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 7: SolicitudRejectDialog — Preventive Branch

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudRejectDialog.tsx`

- [ ] **Step 1: Add import**

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

- [ ] **Step 2: Add preventive detection**

Inside the component, add:

```typescript
const isPreventive = request.source === 'preventive';
```

- [ ] **Step 3: Wrap items list in preventive conditional**

Replace the select-all bar + item list section with:

```tsx
{
  isPreventive ? (
    <PreventiveInfoCard preventiveType={request.preventive_type ?? ''} />
  ) : (
    <>
      {/* KEEP the existing select-all checkbox bar (the div with Checkbox + Badge showing selected count)
        and the Separator and the scrollable item list (div with max-h-64 containing pendingItems.map)
        — copy verbatim from the file, do NOT modify */}
    </>
  );
}
```

The rejection reason textarea stays BELOW this conditional (it applies to both preventive and normal).

- [ ] **Step 4: Update footer button text and disable logic**

Change the submit button to handle both cases:

```tsx
<Button
  variant="destructive"
  onClick={handleReject}
  disabled={rejectMutation.isPending || (!isPreventive && selectedItemIds.size === 0) || !reason.trim()}
>
  {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPreventive ? 'Rechazar Solicitud' : `Rechazar ${selectedItemIds.size > 0 ? `(${selectedItemIds.size})` : ''}`}
</Button>
```

- [ ] **Step 5: Update handleReject for preventive**

In the `handleReject` function, handle the preventive case where `selectedItemIds` is empty:

```typescript
const handleReject = async () => {
  try {
    await rejectMutation.mutateAsync({
      requestId: request.id,
      itemIds: isPreventive ? [] : Array.from(selectedItemIds),
      reason: reason.trim(),
    });
    toast.success(isPreventive ? 'Solicitud preventiva rechazada' : 'Items rechazados exitosamente');
    onClose();
  } catch {
    toast.error('Error al rechazar');
  }
};
```

- [ ] **Step 6: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 8: Medium-Change Modals — Operaciones Tab (3 files)

**Files:**

- Modify: `src/features/Mantenimiento/PendientesEjecutar/components/PendienteDetailDialog.tsx`
- Modify: `src/features/Mantenimiento/PendientesEjecutar/components/AprobarFechaDialog.tsx`
- Modify: `src/features/Mantenimiento/PendientesEjecutar/components/RechazarFechaDialog.tsx`

For all three files, the pattern is the same: add `PreventiveInfoCard` import, detect preventive source, wrap the items section.

- [ ] **Step 1: PendienteDetailDialog**

In `src/features/Mantenimiento/PendientesEjecutar/components/PendienteDetailDialog.tsx`, add import:

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

Replace the items section (the `<div>` with heading "Desvios del Pedido") with:

```tsx
{
  /* Items/Desvios */
}
<div>
  {order.maintenance_requests?.source === 'preventive' && (
    <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} className="mb-3" />
  )}
  {items.length > 0 && (
    <>
      <h4 className="font-semibold mb-2">Desvíos del Pedido ({items.length})</h4>
      <div className="space-y-2">
        {items.map((item, index) => {
          // KEEP the existing item rendering code from the file verbatim — do NOT modify it
        })}
      </div>
    </>
  )}
  {items.length === 0 && order.maintenance_requests?.source !== 'preventive' && (
    <p className="text-muted-foreground text-sm">No hay desvíos registrados</p>
  )}
</div>;
```

- [ ] **Step 2: AprobarFechaDialog**

In `src/features/Mantenimiento/PendientesEjecutar/components/AprobarFechaDialog.tsx`, add import:

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

Replace the items section (the `<div>` with "Items a Reparar" heading) with:

```tsx
{
  /* Lista de Items */
}
<div>
  {order.maintenance_requests?.source === 'preventive' && (
    <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} className="mb-3" />
  )}
  {items.length > 0 && (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Items a Reparar</span>
        <Badge variant="secondary">{items.length} items</Badge>
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        <div className="space-y-2 pr-2">
          {items.map((item, index) => {
            // KEEP the existing item rendering code from the file verbatim — do NOT modify it
          })}
        </div>
      </div>
    </>
  )}
  {items.length === 0 && order.maintenance_requests?.source !== 'preventive' && (
    <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>
  )}
</div>;
```

- [ ] **Step 3: RechazarFechaDialog**

In `src/features/Mantenimiento/PendientesEjecutar/components/RechazarFechaDialog.tsx`, add import:

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

Replace the items section with:

```tsx
{
  /* Lista de Items */
}
<div>
  {order.maintenance_requests?.source === 'preventive' && (
    <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} className="mb-3" />
  )}
  {items.length > 0 && (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Items a Reparar</span>
        <Badge variant="secondary">{items.length} items</Badge>
      </div>
      <div className="max-h-[150px] overflow-y-auto">
        <div className="space-y-2 pr-2">
          {items.map((item, index) => {
            // KEEP the existing item rendering code from the file verbatim — do NOT modify it
          })}
        </div>
      </div>
    </>
  )}
  {items.length === 0 && order.maintenance_requests?.source !== 'preventive' && (
    <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>
  )}
</div>;
```

Note: `RechazarFechaDialog` does not currently access `order.maintenance_requests?.source`. You need to destructure it from the order prop at the top of the component:

```typescript
const source = order.maintenance_requests?.source;
const preventiveType = order.maintenance_requests?.preventive_type;
```

Then use `source` in the conditions above instead of `order.maintenance_requests?.source`.

- [ ] **Step 4: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 9: Medium-Change Modals — Taller Tab (2 files)

**Files:**

- Modify: `src/features/Mantenimiento/PedidosMantenimiento/components/PlanificarPedidoDialog.tsx`
- Modify: `src/features/Mantenimiento/PedidosMantenimiento/components/EntradaTallerDialog.tsx`

- [ ] **Step 1: PlanificarPedidoDialog**

In `src/features/Mantenimiento/PedidosMantenimiento/components/PlanificarPedidoDialog.tsx`, add import:

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

Add a derived variable near the top of the component:

```typescript
const isPreventive = order.maintenance_requests?.source === 'preventive';
```

Replace the items heading `<div>` and `<ScrollArea>` pair with:

```tsx
{/* Items a reparar */}
{isPreventive && (
  <div className="px-6 pt-3 pb-4">
    <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} />
  </div>
)}

{itemCount > 0 && (
  <>
    <div className="px-6 pt-3 pb-1">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5" />
        Items a reparar
        <span className="text-xs font-normal normal-case">({itemCount})</span>
      </h3>
    </div>

    <ScrollArea className="max-h-[35vh]">
      <div className="px-6 pb-4 space-y-3">
        {Object.entries(itemsByRepairType).map(([repairType, items]) => (
          // KEEP the existing grouped items rendering code from the file verbatim — do NOT modify it
        ))}
      </div>
    </ScrollArea>
  </>
)}

{itemCount === 0 && !isPreventive && (
  <div className="px-6 pb-4">
    <p className="text-muted-foreground text-center py-6 text-sm">No hay items registrados</p>
  </div>
)}
```

- [ ] **Step 2: EntradaTallerDialog**

In `src/features/Mantenimiento/PedidosMantenimiento/components/EntradaTallerDialog.tsx`, add import:

```typescript
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
```

Add a derived variable:

```typescript
const isPreventive = order.maintenance_requests?.source === 'preventive';
```

In the info panel section, replace the "Items a reparar" count row. Find the line that shows item count (inside the info grid) and change it to handle preventive:

```tsx
<div>
  <span className="text-sm text-muted-foreground">Items a reparar</span>
  <span className="block font-medium">{isPreventive && items.length === 0 ? 'Preventivo' : items.length}</span>
</div>
```

Replace the items list section. The current code is `{items.length > 0 && (<div>...</div>)}`. Change to:

```tsx
{
  /* Preventive info card */
}
{
  isPreventive && (
    <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} className="mb-2" />
  );
}

{
  /* Lista de items */
}
{
  items.length > 0 && (
    <div className="space-y-2">
      <Label>Items a Reparar</Label>
      <div className="max-h-[150px] overflow-y-auto">
        <div className="space-y-2 pr-2">
          {items.map((item, index) => {
            // KEEP the existing item rendering code from the file verbatim — do NOT modify it
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 10: OrderDetailDialog — Preventive Type Badge

> **Note:** This is a single file (`OrderDetailDialog.tsx`) used in 3+ contexts: Operaciones Step 4 (context="operations"), Taller Step 3 (context="workshop"), and Taller Step 4 (context="workshop"). The change applies to all contexts since the "Origen" field is always rendered regardless of context.

**Files:**

- Modify: `src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx`

- [ ] **Step 1: Add imports**

```typescript
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
```

- [ ] **Step 2: Enhance the Origen field**

Find the "Origen" block in the vehicle info grid:

```tsx
{
  order.source && (
    <div>
      <span className="text-xs text-muted-foreground block">Origen</span>
      <span className="font-medium capitalize">
        {order.source === 'checklist' ? 'Checklist' : order.source === 'preventive' ? 'Preventivo' : 'Manual'}
      </span>
    </div>
  );
}
```

Replace with:

```tsx
{
  order.source && (
    <div>
      <span className="text-xs text-muted-foreground block">Origen</span>
      <span className="font-medium capitalize">
        {order.source === 'checklist' ? 'Checklist' : order.source === 'preventive' ? 'Preventivo' : 'Manual'}
      </span>
      {order.source === 'preventive' &&
        (() => {
          const ptKey = (order.preventive_type ??
            (!Array.isArray(order.maintenance_requests) ? order.maintenance_requests?.preventive_type : undefined)) as
            | PreventiveType
            | undefined;
          const PtIcon = ptKey ? PREVENTIVE_TYPE_ICONS[ptKey] : undefined;
          const ptLabel = ptKey ? PREVENTIVE_TYPES[ptKey] : undefined;
          return ptLabel ? (
            <Badge variant="secondary" className="mt-1 gap-1 text-xs">
              {PtIcon && <PtIcon className="h-3 w-3" />}
              {ptLabel}
            </Badge>
          ) : null;
        })()}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 11: Final Verification

- [ ] **Step 1: Full type check**

```bash
npm run check-types
```

Expected: PASS with 0 errors.

- [ ] **Step 2: Visual verification checklist**

Start the dev server and manually verify each view with a preventive maintenance order:

**Operaciones Tab:**

- [ ] Step 1 table: Items column shows "Preventivo" badge with tooltip
- [ ] Step 1 SolicitudDetailDialog: Shows preventive info (already worked before)
- [ ] Step 1 SolicitudApprovalDialog: Shows PreventiveInfoCard + Aprobar/Rechazar buttons
- [ ] Step 1 SolicitudRejectDialog: Shows PreventiveInfoCard + rejection reason + "Rechazar Solicitud"
- [ ] Step 2 table: Items column shows "Preventivo" badge with tooltip
- [ ] Step 2 PendienteDetailDialog: Shows PreventiveInfoCard
- [ ] Step 2 AprobarFechaDialog: Shows PreventiveInfoCard + "Aprobar Fecha"
- [ ] Step 2 RechazarFechaDialog: Shows PreventiveInfoCard + rejection reason
- [ ] Step 3 table: Items column shows "Preventivo" badge with tooltip
- [ ] Step 3 ParaTallerDetailDialog: Shows preventive info (already worked before)
- [ ] Step 4 OrderDetailDialog: Shows preventive_type badge next to Origen

**Taller Tab:**

- [ ] Step 1 table (active): "Preventivo" badge with tooltip
- [ ] Step 1 table (legacy): "Preventivo" badge with tooltip
- [ ] Step 1 PlanificarPedidoDialog: Shows PreventiveInfoCard + date input works
- [ ] Step 2 table (active): "Preventivo" badge with tooltip
- [ ] Step 2 table (legacy): "Preventivo" badge with tooltip
- [ ] Step 2 EntradaTallerDialog: Shows PreventiveInfoCard + km input works
- [ ] Step 3 OrderDetailDialog (workshop): Shows preventive_type badge
- [ ] Step 4 OrderDetailDialog (workshop): Shows preventive_type badge
