# Compras — Etapa 3 (recepción de lo comprado) — Plan de implementación

> **Para quien lo ejecute:** se implementa tarea por tarea, en orden, con ejecución nativa y una revisión final de todo el branch con un revisor nuevo. No se commitea sin pedido explícito del usuario. El commit de la etapa es uno, de una línea, sin push.

**Objetivo:** registrar contra una OC enviada lo que entrega el proveedor (parcial o total). Los materiales entran a Almacenes con el costo de la OC y los servicios se dan por recibidos. El excedente se regulariza con una OC complementaria automática y la OC se puede cerrar con faltante.

**Arquitectura:** entidad nueva `purchase_receipts` en `src/features/Purchases/`. Registra la entrada con `registerStockMovement` y `linkTiresFromEntry` de Almacenes, en la misma transacción (`withActor`). La OC suma estados de recepción y cierre. El avance de la solicitud cambia su cuenta para las OC cerradas. Se reusan:
- `lockPurchaseOrder`;
- `nextPurchaseDocumentNumber` (con kind `receipt`);
- `toPurchaseActionError`;
- `ConfirmAction`, `HistoryCard` y `invalidatePurchases`.

**Stack:** Next.js 16, Prisma 7 + Postgres, React Query, RHF + Zod, shadcn, Vitest, pgTAP, MinIO.

**Spec:** `docs/superpowers/specs/2026-10-09-compras-etapa-3-design.md` (fuente de verdad).
**Base:** rama `feat/compras-etapa-1`, sobre el commit de la etapa 2 (`c3691722`). El push y el PR van recién al cerrar el módulo.

## Restricciones globales

- **Empresa:** sale de la sesión. Toda OC, línea, depósito y recepción se valida contra ella.
- **Mutaciones:** devuelven `ActionResult`. Los errores de negocio son `PurchaseError`, o `StockError` cuando los lanza el motor; los dos pasan por `toPurchaseActionError`.
- **Escritura de stock:** solo a través del motor (`registerStockMovement` / `reverseStockMovement`); Compras nunca escribe `stock_balances`, `material_units` ni `material_batches`. Las transacciones que tocan stock van con `withActor(profile.credentialId, …, prisma, { timeout: 20_000, maxWait: 5_000 })`, como en Almacenes.
- **Orden de locks:** OC (`purchase_orders FOR UPDATE`), después solicitudes (si hay que recalcular avance, con `lockRequestsForLines`), después el motor (materiales, saldos, unidades) y al final la numeración.
- **Código:** sin `any` ni `console.*`; moment.js; código en inglés y UI en español; schemas en `schemas/`, sin directiva; nada de server importando de un módulo `'use client'`.
- **Tipos para `next build`:** las funciones de `lib/` se tipan con `Pick<Prisma.TransactionClient, …>`.
- **Migraciones:** carpeta manual + `npx prisma migrate deploy`. Los valores nuevos de enum van en una migración propia, antes del SQL que los usa.
- **Permisos:** por migración, solo los 3 roles de sistema. Tab nueva en `permissions-map.ts`.
- **DataTables:** las crea el agente `table-expert`. Botones dentro de `<form>` que no guardan llevan `type="button"`.
- **Verificación:** `NODE_OPTIONS=--max-old-space-size=8192 npm run check-types`; `npx next build` antes de cerrar. Prohibido lint, prettier y format.

## Foco de revisión

1. **Dos recepciones simultáneas de la misma OC que juntas superan lo que falta:** la segunda ve lo de la primera, su parte de más va a la complementaria y nunca se cuenta dos veces. Task 4.
2. **Anular una recepción cuyo material ya salió de Almacenes:** sale el mensaje del motor y no queda nada a medias (ni la OC recalculada ni la complementaria anulada). Task 4.
3. **Anular el movimiento de una recepción desde Almacenes:** se rechaza con "Se anula desde la recepción RC-…". Task 4.
4. **Cerrar una OC recibida en parte:** lo no recibido vuelve a "falta" en la solicitud y la línea se puede volver a pedir. Task 3.
5. **Recibir un serializado con una serie repetida, o un lote con distinto vencimiento:** sale el mensaje del motor y no queda nada guardado (ni la recepción ni la OC complementaria). Task 4.

---

### Task 1: Esquema, migraciones y permisos

- **Modify** `prisma/schema.prisma`:
  - `purchase_order_status` suma `PARTIALLY_RECEIVED`, `RECEIVED` y `CLOSED`;
  - `purchase_orders` suma:
    - `closed_by?`, `closed_at?` y `close_reason?`;
    - `complements_order_id?` (self relation `complements` / `complemented_by`);
    - `complements_receipt_id?` (FK a `purchase_receipts`);
  - modelos `purchase_receipts` y `purchase_receipt_lines`, según la spec §2.1:
    - `stock_movement_id` y `reversal_movement_id` son FK a `stock_movements`, `@unique` las dos;
    - `serial_numbers String[] @default([])`;
    - `received_on` y `batch_expires_on` son `@db.Date`;
    - `order_line_id` FK a `purchase_order_lines`, `NoAction`; las líneas a su cabecera, `Cascade`;
  - relaciones inversas en `company`, `profile` (creador y anulador), `suppliers`, `warehouses`, `stock_movements` y `purchase_order_lines`.
- **Create** las migraciones:
  - `prisma/migrations/20261009100000_purchase_order_receipt_statuses/migration.sql`: los 3 `ADD VALUE IF NOT EXISTS`.
  - `prisma/migrations/20261009100100_purchase_receipts/migration.sql`: el diff de Compras (sin el drift de índices parciales) más los CHECK de la spec §2.3:
    - `quantity > 0`, `unit_cost >= 0`;
    - anulación de la recepción (4 campos) completa o vacía;
    - cierre de la OC completo o vacío, y `status <> 'CLOSED' OR closed_at IS NOT NULL`;
    - `(complements_order_id IS NULL) = (complements_receipt_id IS NULL)`;
    - único `(company_id, number)` en recepciones; índices por `order_id`, `order_line_id` y `warehouse_id`.
  - `prisma/migrations/20261009100200_purchases_receipts_permissions/migration.sql`:
    - tab `recepciones` (`c0000000-0000-0000-0000-000000000006`, "Recepciones");
    - `order_index`: solicitudes 0, cotizaciones 1, ordenes 2, recepciones 3, proveedores 4, config 5;
    - permisos `view`, `create` y `update` a los 3 roles.
- **Modify:**
  - `permissions-map.ts`: tab `recepciones`, con comentario: 'update' anula;
  - `navigation.ts`: sub-ítem "Recepciones", ícono `PackageCheck`.
- **Modify** `prisma/tests/03_purchases.sql`:
  - recepción con cantidad 0;
  - costo negativo;
  - anulación a medias;
  - OC `CLOSED` sin motivo;
  - complementaria sin recepción de origen;
  - número de recepción duplicado.
- **Verificación:** `migrate deploy`, `prisma generate`, `npm run test:db` y `check-types`. Los errores de tipos por los estados nuevos se resuelven en la Task 2.

### Task 2: Reglas puras con tests unitarios

- **Modify** `lib/order-state-machine.ts` + test:
  - estados `PARTIALLY_RECEIVED`, `RECEIVED` y `CLOSED`, con labels "Recibida en parte", "Recibida" y "Cerrada" y sus participios;
  - acciones nuevas:
    - `receive`: desde `SENT` o `PARTIALLY_RECEIVED`;
    - `close`: desde `SENT` o `PARTIALLY_RECEIVED`, resultado `CLOSED`;
  - `cancel` ya no incluye `PARTIALLY_RECEIVED`, `RECEIVED` ni `CLOSED`. "Sin recepciones vigentes" en `SENT` se valida en el servidor;
  - `RECEIVING_ORDER_STATUSES = ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED']`;
  - `receiptStatus(lines: { ordered: string; received: string }[]): 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED'` (0 recibido → `SENT`);
  - `purchaseOrderWatermark`: `CLOSED` → `null`.
- **Create** `lib/receipt-math.ts` + test. Puro, con `parseScaled`/`formatScaled` a `QUANTITY_SCALE`:
  - `splitReceived({ remaining, received }) → { withinOrder: string; excess: string }`.
  - Tests: sin excedente, excedente exacto, nada pendiente (todo excedente) y decimales.
- **Modify** `lib/document-number-format.ts` y `lib/document-number.ts`: kind `receipt` → `RC`, tabla `purchase_receipts`. Ampliar el test.
- **Modify** `Orders/components/PurchaseOrderStatusBadge.tsx`: íconos y colores de los 3 estados nuevos, con clases escritas completas:
  - `PackageOpen`, sky;
  - `PackageCheck`, verde oscuro;
  - `Lock`, gris.
- **Verificación:** `npx vitest run src/features/Purchases/lib` y `check-types`.

### Task 3: Avance de la solicitud y cierre de la OC

- **Modify** `lib/order-progress.ts`:
  - `orderedByLine` y la subconsulta de `recomputeRequestProgress` / `findOrderableRequestLines` cuentan, por línea de solicitud:
    - Σ `ol.quantity` de OC con `status NOT IN ('CANCELLED','CLOSED')`;
    - más Σ de lo recibido en recepciones vigentes de las líneas de OC `CLOSED`.
  - Se extrae a una sola expresión SQL reutilizable, `ORDERED_QUANTITY_SQL`, para que las tres consultas no diverjan (lección del 712).
  - `assertWithinRemaining` exime a las líneas de una OC complementaria: se valida en `validatePurchaseOrderInput` con un flag `{ complement: true }` que solo pasa el servidor al editar o enviar una OC con `complements_order_id`.
- **Modify** `lib/orders.ts`:
  - `lockPurchaseOrder` sigue igual;
  - nuevo `receivedByOrderLine(tx, orderLineIds) → Map<string, string>` (recepciones vigentes);
  - nuevo `recomputeOrderReceiptStatus(tx, orderId)`: en `RECEIVING_ORDER_STATUSES` aplica `receiptStatus`; en el resto no toca.
- **Modify** `actions/orders.server.ts`:
  - `closePurchaseOrder(id, reason)` (`ordenes:update`):
    - lock de la OC; `canApplyPurchaseOrderAction(status, 'close')`;
    - lock de las solicitudes de sus líneas;
    - escribe el cierre y `recomputeRequestProgress`;
  - `cancelPurchaseOrder`: si tiene recepciones vigentes, "La orden OC-… tiene recepciones: no se puede anular. Si no va a llegar lo que falta, cerrala".
  - `approvePurchaseOrder`: si `complements_order_id`, el estado resultante es `RECEIVED` (con `approved_*`), no `APPROVED`.
  - `updatePurchaseOrderDraft` / `submitPurchaseOrder`: pasan `{ complement: true }` si la OC es complementaria.
  - `getPurchaseOrderDetail` suma:
    - por línea, `received` y `pendingReceipt`;
    - `receipts: { id, number, receivedOn, deliveryNote, cancelled }[]`;
    - `complements` y `complementedBy`;
    - historial con recepciones y cierre;
    - `can.receive` (`recepciones:create` + estado) y `can.close`.
- **Test** (en `orders.integration.test.ts`):
  - cerrar una OC `SENT` sin recepciones → la solicitud vuelve a `APPROVED` y la línea aparece de nuevo en `searchOrderableRequestLines`;
  - cerrar desde `DRAFT` → rechazado;
  - el resto (cerrar recibida en parte) va en la Task 4.
- **Verificación:** `npm run test:purchases` y `check-types`.

### Task 4: Recepciones (servidor)

- **Create** `schemas/receipts.ts`:
  - `purchaseReceiptFormSchema`:
    - `orderId`, `warehouseId` (uuid o vacío), `receivedOn` (`YYYY-MM-DD`), `deliveryNote` (máx. 60) y `notes`;
    - `lines: { orderLineId, quantity: string, batchNumber, batchExpiresOn, serialNumbers: string }[]`, donde la cantidad vacía o 0 = no llegó;
    - `superRefine`: decimales a 4 con `parseScaled`; al menos una línea con cantidad > 0; las series se parsean con `parseSerialNumbers` de Almacenes;
  - `toPurchaseReceiptInput`.
  - Adjunto: `RECEIPT_ATTACHMENT_MAX_BYTES` / `TYPES`, iguales a los de la cotización.
- **Create** `lib/receipts.ts` (`server-only`):
  - `lockPurchaseReceipt(tx, companyId, id)`;
  - `loadReceivableOrder(tx, companyId, orderId)`:
    - lock de la OC y `receive`;
    - devuelve sus líneas con material (id, código, nombre, `tracking_type`, unidad) o descripción, precio, alícuota, pedido, recibido y destino de la solicitud.
- **Create** `actions/receipts.server.ts` (`'use server'`):
  - `createPurchaseReceipt(values)` (`recepciones:create`), en `withActor`:
    1. `loadReceivableOrder`; cada línea del form tiene que ser de esa OC;
    2. si hay materiales, el depósito es obligatorio, de la empresa y activo;
    3. por línea, `splitReceived(remaining, quantity)`;
    4. si alguna tiene excedente, crea la OC complementaria:
       - número `OC-`, `DRAFT`, mismo proveedor, `payment_term_days` de la original;
       - líneas con `computeOrderLine` (mismo precio y alícuota) y totales;
       - `complements_order_id`, y nota "Regulariza el excedente recibido en {RC}" (el número RC se reserva antes);
    5. número `RC-` y alta de la recepción y sus líneas: la parte dentro de la OC apunta a la línea original; el excedente, a la línea de la complementaria;
    6. si hay materiales, `registerStockMovement` (`ENTRY`, `reference` "RC-… · OC-…", `occurredOn` = fecha de recepción) y `linkTiresFromEntry`, y se guarda `stock_movement_id`;
    7. `recomputeOrderReceiptStatus` de la OC y `recomputeRequestProgress` de sus solicitudes (lock con `lockRequestsForLines` antes del motor, para respetar el orden de locks);
    8. devuelve `{ id, number, movementNumber, warehouseName, complementNumber }`.
  - `uploadPurchaseReceiptAttachment(id, formData)` (`recepciones:create`): mismo patrón que la cotización.
  - `cancelPurchaseReceipt(id, reason)` (`recepciones:update`), en `withActor`:
    1. lock de la recepción (vigente), luego de su OC;
    2. si tiene cubiertas: "Las recepciones con cubiertas no se anulan: se corrigen desde Gomería";
    3. complementaria aprobada (`RECEIVED`): "Primero resolvé la OC complementaria OC-…"; en `DRAFT` o `PENDING_APPROVAL`, se anula con el mismo motivo;
    4. `reverseStockMovement` (si hay movimiento) y se guarda `reversal_movement_id`;
    5. marca la anulación; recalcula la OC y las solicitudes.
  - `getPurchaseReceiptDetail(id)` (`recepciones:view`):
    - cabecera, OC, proveedor, depósito, adjunto (`buildStorageFileUrl`) y líneas con ítem, lote o series;
    - movimiento y anulación (números, con enlace);
    - complementaria y su estado, y `excessWithoutOrder` (la complementaria está anulada);
    - historial y `can.cancel`.
  - `getReceiptFormData(orderId)` (`recepciones:create`):
    - la OC (número, proveedor) y sus líneas con algo por recibir (con tracking del material e imputación);
    - los depósitos activos (`id`, `code`, `name`).
- **Modify** `src/features/Warehouses/actions/movements.server.ts` → `reverseStockMovementAction`: si el movimiento es el `stock_movement_id` de una recepción, `StockError('MANAGED_ELSEWHERE', 'Se anula desde la recepción RC-…')`.
- **Modify:**
  - `lib/query-keys.ts`: `receipts: ['purchase-receipts']`;
  - `lib/invalidate.ts`: suma `receipts`;
  - `scripts/test-purchases.sh`: suma `receipts.integration.test.ts`.
- **Test** `actions/receipts.integration.test.ts`, con sesión, permisos y tenant mockeados (no mails):
  - **Datos propios:** depósito; material por cantidad; material por lote; material serializado; material de cubierta con su combinación en `tire_materials`, creada por el test; solicitud aprobada y OC `SENT` creadas por las actions.
  - **Recepciones:**
    - parcial → OC `PARTIALLY_RECEIVED`, `stock_balances` sube, `materials.average_cost` = precio;
    - total → `RECEIVED`;
    - solo servicio → sin movimiento;
    - lote con vencimiento y serializado con 2 series;
    - cubierta → aparece en `tires`.
  - **Excedente:**
    - crea la complementaria `DRAFT` con la cantidad excedente;
    - aprobarla la deja `RECEIVED`;
    - anularla marca `excessWithoutOrder`.
  - **Concurrencia:** dos `createPurchaseReceipt` en paralelo de 6 + 6 sobre una línea de 10 → recibido total 12, una de las dos generó una complementaria de 2 y no hay doble conteo.
  - **Errores del motor:** serie repetida → mensaje del motor, nada creado (ni recepción ni complementaria).
  - **Anular:**
    - OK → la OC vuelve a `SENT` y el stock baja;
    - stock ya salido (salida directa en el medio) → mensaje y nada cambia;
    - complementaria aprobada → rechazado;
    - con cubiertas → rechazado;
    - desde Almacenes → "Se anula desde la recepción".
  - **Cerrar:** una OC recibida en parte se cierra y la solicitud vuelve a tener faltante por lo no recibido.
  - **Anular una OC con recepciones** → rechazado.
  - **Perímetro y permisos:**
    - OC de otra empresa; depósito de otra empresa o inactivo; línea de otra OC;
    - sin `recepciones:create` no recibe.
- **Verificación:** `npm run test:purchases`, `npm run test:warehouses` y `check-types`.

### Task 5: Pantallas

- **Modify** `PurchasesComponent.tsx`: tab `recepciones` → `Receipts/ReceiptsTabContent.tsx`. Sin botón "Nueva": se recibe desde la OC; la tabla la arma la Task 6.
- **Create** `src/app/dashboard/purchases/receipts/new/page.tsx` y `receipts/[id]/page.tsx` → `src/features/Purchases/Receipts/`:
  - `ReceiptPages.tsx`.
  - `components/PurchaseReceiptForm.tsx`:
    - cabecera: depósito (select de los activos, solo si hay materiales), fecha con `EnhancedDatePicker`, remito y notas, y el adjunto en el mismo submit (guardar → subir; si la subida falla, aviso y la recepción queda);
    - una tarjeta por línea con ítem, imputación y "falta recibir"; cantidad precargada en lo que falta;
    - según el tracking: lote + vencimiento, o un textarea de series (una por línea, con el contador "3 de 3");
    - el aviso de excedente en la fila;
    - un solo submit; el toast con números de la spec §4.
  - `components/PurchaseReceiptDetailView.tsx` y `PurchaseReceiptActions.tsx`: Anular (`ConfirmAction` con motivo) y los enlaces.
- **Modify:**
  - `Orders/components/PurchaseOrderDetailView.tsx`: columnas "Recibido" y "Falta recibir" en `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED` y `CLOSED`; sección Recepciones; enlaces de complementaria;
  - `PurchaseOrderActions.tsx`:
    - **Registrar recepción** (link a `receipts/new?order=`);
    - **Cerrar** (`ConfirmAction` con motivo);
    - en una complementaria, el texto de Aprobar dice "Queda recibida: el excedente ya está en el depósito".
- **Verificación:** `check-types` + navegador (dev server reiniciado tras `prisma generate`).

### Task 6: Tablas (agente `table-expert`)

- **Recepciones** (`Receipts/ReceiptsList/`):
  - columnas: número, fecha de recepción, OC (link), proveedor, depósito, remito, estado (Vigente / Anulada, derivado de `cancelled_at`), solicitudes de origen (M:M vía `lines.order_line.request_line.request`) y creó;
  - facets lazy, export "Recepciones", `PURCHASES_QUERY_KEYS.receipts`.
- **Órdenes de compra:** los filtros y labels de estado suman los 3 nuevos (desde `PURCHASE_ORDER_STATUS_LABELS` / `purchaseOrderStatusIcons`).

### Task 7: Demo

- **Modify** `scripts/demo/domains/purchases.ts`: después de las OC de la etapa 2, recepciones que pasan por el motor real. Se llama a `registerStockMovement` del motor con el `tx` de la demo; si el script no puede importar `src/` con alias, se arma el movimiento con el mismo arnés que usa la demo de Almacenes (verificar `scripts/demo/domains/warehouses.ts`):
  - una OC nueva recibida en parte, con un material por lote;
  - una OC recibida completa con excedente, y su complementaria `PENDING_APPROVAL`;
  - una OC `CLOSED` con faltante (la solicitud queda con pendiente);
  - una recepción de un servicio (la OC del rectificado, aprobada y enviada).
- **Verificación:** arnés en transacción descartada (scratchpad):
  - saldos = suma del libro de movimientos;
  - recibido ≤ pedido + excedente;
  - estados de OC y solicitudes coherentes con `receiptStatus` / `progressStatus`.

### Task 8: Manual de uso

- **Create** `src/content/manual/compras/recepciones.mdx`:
  - registrar desde la OC;
  - depósito, remito, lote y series;
  - excedente y OC complementaria;
  - servicios;
  - anular (y cuándo no se puede);
  - la lista.
- **Modify:**
  - `ordenes-de-compra.mdx`: estados nuevos, cerrar, complementaria, anular solo sin recepciones;
  - `solicitudes-de-compra.mdx`: "pedido en OC" con OC cerradas;
  - `compras.mdx`: sección, permisos, conceptos y "lo que viene";
  - `almacenes/movimientos-de-stock.mdx`: ingresos desde Compras y dónde se anulan.
- **Modify:**
  - `catalog/sections/compras.ts`: guía `recepciones` (tab y `/dashboard/purchases/receipts/*`);
  - `home.ts`: camino "Comprar".
- **Verificación:** `npm run manual:check`.

### Task 9: Verificación final

- Comandos (con 8 GB donde corre `tsc` o el build):
  - `check-types`, `npm test`, `npm run test:db`, `npm run test:purchases`, `npm run test:warehouses` y `npm run manual:check`;
  - `npx next build`.
- Navegador:
  - recibir en parte (lote) y completar con excedente (complementaria);
  - aprobar la complementaria → Recibida;
  - recepción de un servicio;
  - serializado con series;
  - anular una recepción;
  - intentar anular su movimiento desde Almacenes;
  - cerrar una OC con faltante y verla de nuevo pendiente en la solicitud;
  - 375 px sin scroll horizontal en el formulario y en los detalles.
  - Medir en el DOM.
- Revisión final del branch con un revisor nuevo (modelo más capaz). Se arreglan los Critical/Important con test RED→GREEN.
- Commit (con el OK del usuario): `feat(compras): etapa 3 - recepcion de ordenes de compra con entrada a stock y oc complementaria por excedente`, sin `.codex/` ni `AGENTS.md`, sin push.
