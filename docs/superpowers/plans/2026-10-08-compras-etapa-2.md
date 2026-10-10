# Compras — Etapa 2 (pedidos de cotización y órdenes de compra) — Plan de implementación

> **Para quien lo ejecute:** se implementa tarea por tarea, en orden. Cada tarea termina con su verificación. No se commitea sin pedido explícito del usuario. El commit de la etapa es uno, de una línea, sin push.

**Objetivo:** que una solicitud aprobada se cotice a uno o varios proveedores (opcional), se compare y termine en una orden de compra aprobada y enviada al proveedor con su PDF. El avance de la solicitud (en parte, ordenada, cerrada) se calcula a partir de las OC.

**Arquitectura:** dos entidades nuevas en `src/features/Purchases/`: pedido de cotización (`purchase_quotes`) y orden de compra (`purchase_orders`), cada una con sus líneas apuntando a `purchase_request_lines`. Se copian los patrones de la etapa 1:
- máquinas de estado puras en `lib/`;
- numeración con advisory lock;
- `lockPurchaseRequest` / `FOR UPDATE`;
- `ActionResult` + `toPurchaseActionError`;
- mails después de la transacción.

Hay tres piezas nuevas:
- la cuenta de "lo que falta" por línea (`lib/order-progress.ts`), que también recalcula el estado de la solicitud;
- los PDF con `@react-pdf/renderer` en el servidor;
- los adjuntos en `sendMail`.

**Stack:** Next.js 16, Prisma 7 + Postgres, React Query, RHF + Zod, shadcn, Vitest, pgTAP, MinIO, nodemailer y `@react-pdf/renderer` (ya instalado, lo usa Facturación).

**Spec:** `docs/superpowers/specs/2026-10-08-compras-etapa-2-design.md` (fuente de verdad).
**Base:** rama `feat/compras-etapa-1`, sobre el commit de la etapa 1 (`2da9f886`). El push y el PR van recién al cerrar el módulo.

## Restricciones globales

- **Empresa:** sale de la sesión (`getActiveCompanyId`). Todo id del cliente (proveedor, línea de solicitud, línea de cotización, cotización) se valida contra ella.
- **Mutaciones:** devuelven `ActionResult` y se usan con `unwrapAction`. Los errores de negocio son `PurchaseError(message)` y se traducen con `toPurchaseActionError`.
- **Código y nombres:** sin `any` ni `console.*` (usar `Logger`); fechas con moment.js; código en inglés y UI en español; schemas Zod en `schemas/`, sin directiva.
- **Importes:** una sola aritmética, la de `src/features/Comercial/Facturacion/lib/invoice-math.ts` (`lineNet`, `vatFor`, `sumAmounts`, `parseScaled`, `formatScaled`, `QUANTITY_SCALE`). Enteros escalados con `BigInt`; nada de `parseFloat` ni `Prisma.Decimal` en código que viaja al cliente.
- **Alícuotas:** ids de `VAT_RATES` (`src/shared/lib/arca/catalogs.ts`), validados con `isVatRateId`. Default `DEFAULT_VAT_RATE_ID` (21%).
- **Migraciones:** carpeta manual + `npx prisma migrate deploy`. Los valores nuevos de un enum van en una migración propia, **antes** de cualquier SQL que los use: Postgres no deja usar en la misma transacción un valor recién agregado.
- **Permisos:** por migración, solo a los 3 roles de sistema. Tabs nuevas en `permissions-map.ts` con sus `allowedActions`.
- **Tipos para `next build`:** toda función de `lib/` que reciba el cliente completo o un `tx` se tipa con `Pick<Prisma.TransactionClient, '<modelo>' | ...>`.
- **DataTables:** las crea el agente `table-expert`.
- **Botones dentro de `<form>`** que no guardan: `type="button"`.
- **Verificación:** `NODE_OPTIONS=--max-old-space-size=8192 npm run check-types`; antes de cerrar, `npx next build` completo. Prohibido lint, prettier y format.
- **Manual de uso:** se escribe en la misma etapa (Task 10), con `npm run manual:check` sin problemas.

## Foco de revisión (lo que más probablemente rompa y los tests tienen que fijar)

1. **Dos compradores arman a la vez OC sobre la misma línea de solicitud:** las solicitudes se lockean por id en orden. La segunda ve "De la línea 2 de SC-000012 (Aceite 15W40) quedan 5 l" y nada se pide de más. Task 4.
2. **Editar un borrador de OC sin cambiar las cantidades, con la solicitud ya `ORDERED` justamente por ese borrador:** tiene que guardar. Lo que ya pedía esta OC no cuenta, y la línea no queda bloqueada por el estado `ORDERED`. Task 4.
3. **El envío del mail falla** (SMTP caído o sin configurar): la OC sigue `APPROVED` y la cotización `DRAFT`; el usuario ve "No se pudo enviar el mail…" y nada queda marcado como enviado. Tasks 5 y 6.
4. **Anular una OC de una solicitud `ORDERED`:** la solicitud vuelve a `PARTIALLY_ORDERED` o `APPROVED`. Si estaba `CLOSED`, queda `CLOSED`. Task 4.
5. **Cantidades y precios con coma decimal** (`1.234,5`) **y con más decimales que la escala:** el form los acepta como en Facturación; el servidor rechaza los que exceden la escala con un mensaje, no con un error de base. Tasks 2 y 4.

---

### Task 1: Esquema, migraciones y permisos

**Archivos:**
- Modify: `prisma/schema.prisma`, según la spec §2:
  - enums `purchase_quote_status` (`DRAFT`, `SENT`, `RECEIVED`, `DECLINED`, `CANCELLED`) y `purchase_order_status` (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT`, `CANCELLED`);
  - `purchase_request_status` suma `PARTIALLY_ORDERED`, `ORDERED` y `CLOSED`;
  - `purchase_requests` suma `closed_by?` (FK a `profile`), `closed_at?` y `close_reason?`;
  - modelos `purchase_quotes`, `purchase_quote_lines`, `purchase_orders` y `purchase_order_lines`, con las columnas de la spec:
    - montos `Decimal(15,2)`; precios y cantidades `Decimal(15,4)`;
    - `sent_to String[] @default([])`;
    - `updated_at @updatedAt`;
  - FK:
    - `purchase_quote_lines.request_line_id` y `purchase_order_lines.request_line_id`: `onDelete: Restrict`;
    - las líneas a su cabecera: `onDelete: Cascade`;
    - `purchase_order_lines.quote_line_id` y `purchase_orders.quote_id`: `SetNull`;
  - relaciones inversas en `company`, `profile` (con nombres de relación por columna, como en la etapa 1), `suppliers` y `purchase_request_lines`.
- Create: `prisma/migrations/20261008200000_purchase_request_order_statuses/migration.sql`: solo los tres `ALTER TYPE purchase_request_status ADD VALUE IF NOT EXISTS '…'`.
- Create: `prisma/migrations/20261008200100_purchase_quotes_and_orders/migration.sql`. Lo relevante del `migrate diff` más:
  - únicos `(company_id, number)` en las dos cabeceras y `(quote_id, request_line_id)` en las líneas de cotización;
  - índices por `supplier_id`, `status`, `request_line_id` y `order_id`;
  - CHECK:
    - `quantity > 0`;
    - `unit_price >= 0` (también en las líneas de cotización, cuando no es nulo);
    - línea de cotización: `NOT (not_quoted AND (unit_price IS NOT NULL OR vat_rate_id IS NOT NULL))` y `(unit_price IS NULL) = (vat_rate_id IS NULL)`;
    - OC: los grupos (`approved_by`, `approved_at`), (`sent_at`, `sent_by`) y (`cancelled_by`, `cancelled_at`, `cancel_reason`) van completos o vacíos;
    - `status = 'APPROVED'` exige aprobación, y `status = 'SENT'` exige aprobación y envío;
    - cotización: (`cancelled_by`, `cancelled_at`, `cancel_reason`) completos o vacíos;
    - solicitud: (`closed_by`, `closed_at`, `close_reason`) completos o vacíos, y `status = 'CLOSED'` exige el cierre. Esta última usa el valor nuevo del enum: por eso las migraciones van separadas.
- Create: `prisma/migrations/20261008200200_purchases_quotes_orders_permissions/migration.sql`:
  - tabs `cotizaciones` (`c0000000-0000-0000-0000-000000000004`, "Cotizaciones") y `ordenes` (`…0005`, "Órdenes de compra");
  - `order_index`: solicitudes 0, cotizaciones 1, ordenes 2, proveedores 3, config 4. Se actualizan con `ON CONFLICT DO UPDATE SET order_index`;
  - permisos de los 3 roles: cotizaciones `view, create, update`; ordenes `view, create, update, approve`.
- Modify: `src/features/Permissions/permissions-map.ts`: tabs `cotizaciones` y `ordenes` (entre solicitudes y proveedores) con esos `allowedActions` y un comentario de qué habilita cada uno (spec §3, permisos).
- Modify: `src/features/Layout/sidebar/constants/navigation.ts`: sub-ítems "Cotizaciones" y "Órdenes de compra"; en `SUB_ITEM_ICONS`, `'compras:cotizaciones': FileQuestion` y `'compras:ordenes': FileCheck` (verificar que existan en lucide; si no, `Receipt` / `FileText`).
- Modify: `prisma/tests/03_purchases.sql`, ampliando el `plan(n)`:
  - línea de cotización `not_quoted` con precio;
  - precio sin alícuota;
  - cantidad 0 en una OC;
  - OC `APPROVED` sin `approved_at`;
  - OC `SENT` sin `sent_at`;
  - anulación a medias;
  - número de OC duplicado en la empresa;
  - misma línea de solicitud dos veces en la misma cotización;
  - solicitud `CLOSED` sin motivo.

**Verificación:**
- `npx prisma migrate deploy` y `npx prisma generate`.
- `psql`: `\d purchase_orders` y `\dT+ purchase_request_status`.
- `npm run test:db`, `npm run db:seed` y `check-types`.

### Task 2: Reglas puras (`lib/`) con tests unitarios

**Archivos:**
- Modify: `src/features/Purchases/lib/request-state-machine.ts` + `.test.ts`:
  - `PURCHASE_REQUEST_STATUSES` suma `PARTIALLY_ORDERED`, `ORDERED` y `CLOSED`, con sus labels: "Pedida en parte", "Pedida" y "Cerrada"; en participio, "pedida en parte", "pedida" y "cerrada";
  - acción nueva `close`: desde `APPROVED` o `PARTIALLY_ORDERED`; resultado `CLOSED`;
  - `ORDERABLE_REQUEST_STATUSES = ['APPROVED', 'PARTIALLY_ORDERED']`;
  - `progressStatus(lines: { requested: string; ordered: string }[]): 'APPROVED' | 'PARTIALLY_ORDERED' | 'ORDERED'`. Cantidades como texto, comparadas con `parseScaled(…, QUANTITY_SCALE)`:
    - todas en 0 → `APPROVED`;
    - todas con `ordered >= requested` → `ORDERED`;
    - si no → `PARTIALLY_ORDERED`.
  - Tests: las 3 salidas de `progressStatus`; `close` permitido y prohibido; los estados viejos sin cambios.
- Create: `src/features/Purchases/lib/quote-state-machine.ts` + `.test.ts`:
  - `PURCHASE_QUOTE_STATUSES`;
  - `type PurchaseQuoteAction = 'edit' | 'send' | 'markSent' | 'receive' | 'decline' | 'cancel' | 'order'`:
    - `edit`, `send` y `markSent`: desde `DRAFT`;
    - `receive`: desde `SENT` o `RECEIVED` (corregir una respuesta);
    - `decline`: desde `SENT`;
    - `cancel`: desde `DRAFT` o `SENT`;
    - `order`: desde `RECEIVED`;
  - `canApplyPurchaseQuoteAction(status, action)`;
  - labels "Borrador", "Enviada", "Respondida", "No cotiza" y "Anulada", y sus participios.
  - "Se puede corregir mientras no tenga OC" se valida en el servidor (depende de la base).
- Create: `src/features/Purchases/lib/order-state-machine.ts` + `.test.ts`:
  - `PURCHASE_ORDER_STATUSES`;
  - `type PurchaseOrderAction = 'edit' | 'submit' | 'approve' | 'reject' | 'send' | 'markSent' | 'cancel'`:
    - `edit` y `submit`: desde `DRAFT`;
    - `approve` y `reject`: desde `PENDING_APPROVAL`; `reject` vuelve a `DRAFT`;
    - `send` y `markSent`: desde `APPROVED`;
    - `cancel`: desde todo menos `CANCELLED`;
  - `purchaseOrderStatusAfter(action)`;
  - `purchaseOrderWatermark({ status, approvedAt }): string | null`:
    - "BORRADOR — NO VÁLIDA" en `DRAFT` y `PENDING_APPROVAL`;
    - "ANULADA" en `CANCELLED`;
    - `null` en `APPROVED` y `SENT`.
    - La usa `buildOrderPdfData` (Task 3); hay tests de los 5 estados;
  - labels "Borrador", "Pendiente de aprobación", "Aprobada", "Enviada" y "Anulada", y sus participios.
- Create: `src/features/Purchases/lib/order-totals.ts` + `.test.ts`. Puro, sin directiva; reusa `lineNet`/`vatFor`/`sumAmounts` de `invoice-math.ts`:
  - `computeOrderLine({ quantity, unitPrice, vatRateId }) → { netTotal, vatAmount } | null`: `null` si la cantidad o el precio no parsean o exceden la escala;
  - `computeOrderTotals(lines) → { subtotal, vatTotal, total }`.
  - Tests:
    - redondeo mitad hacia arriba (`3 × 0.3333` = `1.00`; IVA 21% de `10.05` = `2.11`);
    - alícuota 0 y 10,5;
    - suma de varias líneas;
    - precio con 5 decimales → `null`.
- Create: `src/features/Purchases/lib/document-number.ts` + `.test.ts`. Generaliza `request-numbering.ts`:
  - `nextPurchaseDocumentNumber(tx, companyId, kind: 'request' | 'quote' | 'order')`, con tabla, prefijo (`SC-`, `PC-`, `OC-`) y clave de lock por kind;
  - `formatPurchaseDocumentNumber(kind, n)`;
  - `nextPurchaseRequestNumber` queda como alias, para no tocar a sus llamadores;
  - la tabla sale de un `Record` cerrado, nunca del cliente, así que interpolarla con `Prisma.raw` es seguro y queda comentado.
  - Tests del formateo de los 3 prefijos.
- Create: `src/features/Purchases/lib/quantity-format.ts`: `formatRemaining(quantity: string, unitAbbr: string)`. Reusa `formatQuantity` de `Warehouses/lib/format` para los mensajes "quedan 5 l".

**Verificación:** `npx vitest run src/features/Purchases/lib`.

### Task 3: Mail con adjuntos y PDF (pedido de cotización y OC)

**Archivos:**
- Modify: `src/shared/lib/mail/transport.ts`:
  - `MailMessage` suma `attachments?: readonly { filename: string; content: Uint8Array; contentType: string }[]`;
  - se pasan a `transport.sendMail` como `attachments: message.attachments?.map(a => ({ filename, content: Buffer.from(a.content), contentType }))`;
  - el resto no cambia.
  - Test en `src/shared/lib/mail/transport.test.ts` (si existe; si no, crearlo): con nodemailer mockeado (`vi.hoisted`), los adjuntos llegan y un mail sin adjuntos manda `attachments: undefined`.
- Create: `src/features/Purchases/pdf/purchase-pdf-data.ts`. Puro: el view-model con todo ya formateado como texto, como `invoice-pdf-data.ts`:
  - `buildQuotePdfData(source)` y `buildOrderPdfData(source)`;
  - membrete: razón social, CUIT con `formatCuitText`, dirección con localidad y provincia, y `logoUrl?`;
  - proveedor: razón social, CUIT, condición de IVA (label de `RECEIVER_VAT_CONDITIONS`) y dirección;
  - número y fecha (DD/MM/YYYY);
  - `watermark` sale de `purchaseOrderWatermark` (Task 2) en la OC y es siempre `null` en la cotización;
  - líneas: material `[código] nombre` o descripción, cantidad con unidad y, en la OC, unitario, alícuota (`VAT_RATE_LABELS`), neto e IVA;
  - totales; condiciones: entrega, lugar y plazo de pago "N días";
  - notas; `watermark: string | null` ("BORRADOR — NO VÁLIDA" o "ANULADA").
- Create: `src/features/Purchases/pdf/PurchaseQuotePdfDocument.tsx` y `PurchaseOrderPdfDocument.tsx`:
  - misma forma que `InvoicePdfDocument(rp, data)`: reciben el módulo de react-pdf, no lo importan;
  - el pedido de cotización dice "Solicitamos cotización por los siguientes ítems" e indica plazo, validez y condición de pago a informar;
  - la marca de agua va como texto rotado, grande y gris claro, en posición absoluta.
- Create: `src/features/Purchases/pdf/render-purchase-pdf.server.ts` (`server-only`):
  - `loadReactPdf()` como en `render-invoice-pdf.server.ts`;
  - `renderPurchaseQuotePdf(quoteId, companyId)` y `renderPurchaseOrderPdf(orderId, companyId)` → `{ filename: 'PC-000003.pdf', content: Uint8Array }`;
  - leen con perímetro de empresa;
  - el logo: si `company.company_logo` es una URL, se pasa como `src`; si la carga falla, react-pdf no puede romper el PDF, así que se baja antes con `fetch` y timeout de 3 s y, si falla, va sin logo (con un `logger.warn`).
- Test: `src/features/Purchases/pdf/purchase-pdf-data.test.ts`:
  - marca de agua por estado;
  - formateo de líneas de material y texto libre;
  - totales en formato argentino;
  - proveedor sin dirección.

**Verificación:**
- Tests y `check-types`.
- Un script en el scratchpad que renderice un PDF de prueba y lo rasterice con `mupdf` (lección del 554) para mirar el layout.

### Task 4: Servidor — avance de la solicitud y órdenes de compra

**Archivos:**
- Create: `src/features/Purchases/lib/order-progress.ts` (`server-only`):
  - `lockRequestsForLines(tx, companyId, requestLineIds)`:
    - resuelve las solicitudes de esas líneas, valida la empresa y las lockea con `SELECT … FROM purchase_requests WHERE id = ANY(…) ORDER BY id FOR UPDATE`;
    - devuelve un mapa por línea `{ requestId, requestNumber, requestStatus, requested, itemLabel, unitAbbr, position }`.
  - `orderedByLine(tx, requestLineIds, { excludeOrderId? })`: Σ `quantity` de las líneas de OC no anuladas, como texto.
  - `assertWithinRemaining(lines, { locked, ordered })`. Por cada línea pedida, agregada por `request_line_id` (dos líneas de la misma OC sobre la misma línea de solicitud se suman):
    - si supera lo que falta: `PurchaseError("De la línea {position} de {SC} ({item}) quedan {remaining}")`;
    - si no queda nada: "…ya está pedida completa".
  - `recomputeRequestProgress(tx, requestIds)`:
    - para cada solicitud en `ORDERABLE_REQUEST_STATUSES` u `ORDERED`, recalcula con `progressStatus` y escribe solo si cambia;
    - `CLOSED` y los estados previos no se tocan.
- Create: `src/features/Purchases/schemas/orders.ts`:
  - `purchaseOrderFormSchema`:
    - `supplierId`, `deliveryDate?` (`YYYY-MM-DD`), `deliveryPlace?`, `paymentTermDays?` (0–365) y `notes?`;
    - `lines[]` de `{ requestLineId, quoteLineId?, quantity: string, unitPrice: string, vatRateId: number }`, con al menos una línea;
    - `quantity` y `unitPrice` validados con `parseScaled` a sus escalas: "Cantidad inválida (hasta 4 decimales)", lo mismo para el precio, y cantidad > 0;
  - `toPurchaseOrderInput(values)`: normaliza los decimales con `formatScaled`;
  - `requiredReasonSchema` se reusa de `schemas/requests.ts`.
- Create: `src/features/Purchases/lib/orders.ts` (`server-only`):
  - `lockPurchaseOrder(tx, companyId, id)`;
  - `validatePurchaseOrderInput(tx, companyId, input, { orderId? })`:
    - proveedor activo de la empresa;
    - alícuotas con `isVatRateId`;
    - lockea las solicitudes con `lockRequestsForLines`;
    - cada línea de solicitud en `ORDERABLE_REQUEST_STATUSES`, o ya presente en esta misma OC (Foco 2);
    - `quoteLineId`, si viene: de una cotización `RECEIVED` del mismo proveedor y la misma línea de solicitud;
    - `assertWithinRemaining` con `excludeOrderId`;
    - devuelve las líneas con `computeOrderLine` y los totales con `computeOrderTotals`;
  - `expiredSupplierDocuments(tx, supplierId)`: documentos vigentes (`replaced_by_id IS NULL`) con `expires_at < hoy`, para los avisos.
- Create: `src/features/Purchases/actions/orders.server.ts` (`'use server'`; permisos `compras:ordenes:*`):
  - `createPurchaseOrder(values, { submit })` → `ActionResult<{ id, number }>` (`create`):
    - en una transacción, número `OC-`, cabecera, líneas y `recomputeRequestProgress`;
    - `payment_term_days`: el del form o el del proveedor.
  - `createPurchaseOrderFromQuote(quoteId)` (`create`):
    - lock de la cotización; `RECEIVED`;
    - toma las líneas con precio y, para cada una, `min(cotizada, falta)`; omite las que no tienen faltante y, si no queda ninguna, "No queda nada por pedir de esta cotización";
    - crea el borrador con `quote_id` y el plazo de pago del proveedor;
    - devuelve `{ id, number, skipped: number }` para el toast ("Se omitieron N líneas ya pedidas").
  - `updatePurchaseOrderDraft(id, values)` (`update`): lock; `DRAFT`. Reemplaza las líneas (es el mismo borrador) y recalcula el avance de las solicitudes de las líneas viejas **y** las nuevas.
  - `submitPurchaseOrder(id)` (`update`): lock; `DRAFT`; revalida con `validatePurchaseOrderInput` sobre lo guardado; `PENDING_APPROVAL` + `submitted_at`.
  - `approvePurchaseOrder(id)` / `rejectPurchaseOrder(id, reason)` (`approve`):
    - lock; `PENDING_APPROVAL`;
    - aprobar escribe `approved_*` y limpia `rejection_notes`;
    - rechazar vuelve a `DRAFT` con `rejection_notes`, `rejected_by` y `rejected_at`;
    - el mail a quien la creó va después de la transacción, en `try/catch`.
  - `cancelPurchaseOrder(id, reason)` (`update`): lock; todo menos `CANCELLED`; `recomputeRequestProgress`.
  - `closePurchaseRequest(id, reason)`: en `actions/requests.server.ts`, con `compras:solicitudes:update`, `lockPurchaseRequest` y `canApplyPurchaseRequestAction(status, 'close')`.
  - `getPurchaseOrderDetail(id)` (`view`):
    - cabecera, proveedor (con contacto principal) y líneas con solicitud de origen (número + link), ítem, unidad y faltante;
    - totales, avisos de documentos vencidos e historial (creada, enviada a aprobación, rechazada con motivo, aprobada, enviada a…, anulada);
    - `can` por acción × permiso.
  - `getPurchaseOrderFormLookups()` y `searchOrderableRequestLines(query, { supplierId? })`:
    - gated por `compras:ordenes:create` o `compras:cotizaciones:create`;
    - devuelve `{ items: { requestLineId, requestNumber, position, itemLabel, unitAbbr, remaining, suggestedSupplierId }[], total }`, solo con faltante > 0, de solicitudes `ORDERABLE`, ordenado por solicitud y posición, con límite de 50.
  - `getPurchaseOrderPdf(id)` (`view`) → `ActionResult<{ filename, base64 }>`. El cliente arma el `Blob` y lo descarga; no hay ruta de API.
- Modify: `src/shared/lib/mail/templates/purchases.ts`: `sendPurchaseOrderDecisionEmail({ to, number, approved, notes, url })`, con el mismo formato de texto plano que el de la solicitud.
- Modify: `src/features/Purchases/actions/requests.server.ts`, en `getPurchaseRequestDetail`:
  - por línea, `ordered` y `remaining`;
  - `can.close`, `can.requestQuote` y `can.createOrder`;
  - `orders: { id, number, status, supplierName, total }[]`.
- Modify: `src/features/Purchases/lib/query-keys.ts`: `quotes: ['purchase-quotes']` y `orders: ['purchase-orders']`.
- Test: `src/features/Purchases/actions/orders.integration.test.ts`, con sesión, tenant, permisos y `sendMail` mockeados como en `requests.integration.test.ts`:
  - **Ciclo:**
    - OC directa desde una solicitud aprobada → avance `PARTIALLY_ORDERED` o `ORDERED`;
    - enviar a aprobación → aprobar;
    - rechazar → `DRAFT` con motivo → editar → reenviar;
    - anular → la solicitud vuelve atrás (Foco 4);
    - con la solicitud `CLOSED`, anular la OC la deja `CLOSED`.
  - **No pedir de más:**
    - secuencial (la segunda OC excede → mensaje con línea, número e ítem);
    - dos líneas de la misma OC sobre la misma línea de solicitud que juntas exceden;
    - editar un borrador sin cambios con la solicitud `ORDERED` (Foco 2);
    - **concurrente:** dos `createPurchaseOrder` en paralelo con 6 + 6 sobre una línea de 10 → una ok y la otra con "quedan 4" o similar; nunca dos ok.
  - **Totales:** se guardan los del servidor aunque el cliente mande otros (los campos no existen en el schema: se prueba que `subtotal` coincide con `computeOrderTotals`).
  - **Perímetro y permisos:**
    - proveedor de otra empresa, línea de solicitud de otra empresa y solicitud `PENDING_APPROVAL` → rechazados;
    - sin `approve` no aprueba.
  - **Cierre:** `closePurchaseRequest` desde `PARTIALLY_ORDERED` ok y desde `PENDING_APPROVAL` rechazado; después de cerrar, la línea no aparece en `searchOrderableRequestLines`.
  - **Mail de la decisión que falla:** la OC queda aprobada.
  - **Decimales con coma:** `"1.234,5"` se guarda como `1234.5`; `"1,23456"` en precio → mensaje de validación (Foco 5).
- Modify: `scripts/test-purchases.sh`: suma `orders.integration.test.ts` y `quotes.integration.test.ts` (Task 5).

**Verificación:** `npm run test:purchases` y `check-types`.

### Task 5: Servidor — pedidos de cotización

**Archivos:**
- Create: `src/features/Purchases/schemas/quotes.ts`:
  - `requestQuotesSchema`: `{ requestLineIds: uuid[] (≥1), supplierIds: uuid[] (≥1) }`;
  - `purchaseQuoteDraftSchema`: `{ supplierId, notes?, lines: { requestLineId, quantity }[] }`;
  - `quoteResponseSchema`:
    - `{ receivedAt, validUntil?, deliveryDays? (0–365), supplierNotes?, lines: { lineId, notQuoted: boolean, unitPrice?: string, vatRateId?: number }[] }`;
    - con `superRefine`: si no es `notQuoted`, precio válido a 4 decimales y alícuota; al menos una línea con precio;
  - `sendDocumentSchema`: `{ to: email[] (≥1, sin repetidos), message?: string }`. Se usa también para la OC.
- Create: `src/features/Purchases/lib/quotes.ts` (`server-only`): `lockPurchaseQuote(tx, companyId, id)` y `quoteHasOrders(tx, quoteId)`.
- Create: `src/features/Purchases/actions/quotes.server.ts` (`'use server'`; permisos `compras:cotizaciones:*`):
  - `requestQuotes(values)` (`create`):
    - lockea las solicitudes con `lockRequestsForLines`; cada línea, `ORDERABLE`;
    - proveedores activos de la empresa;
    - crea una cotización `DRAFT` por proveedor con las líneas y, como cantidad, **lo que falta**;
    - devuelve `{ quotes: { id, number, supplierName }[] }`.
  - `createPurchaseQuote(values)` (`create`): alta desde la tab, con un proveedor y líneas de cualquier solicitud orderable.
  - `updatePurchaseQuoteDraft(id, values)` (`update`): `DRAFT`.
  - `sendPurchaseQuote(id, { to, message })` (`update`):
    1. lock; `canApplyPurchaseQuoteAction(status, 'send')`;
    2. se leen los datos necesarios y la transacción se cierra: no queda un lock abierto durante el SMTP;
    3. se renderiza el PDF y se llama a `sendMail` con el adjunto;
    4. si devuelve `false`: `fail('No se pudo enviar el mail. Revisá los destinatarios o probá más tarde; la cotización sigue en borrador.')`;
    5. si devuelve `true`: segunda transacción que lockea, verifica que siga `DRAFT` (si no, ok igual: el mail salió, y se loguea) y escribe `SENT`, `sent_at` y `sent_to`.
    - Mismo esquema para la OC (Task 6). Comentar en el código por qué el lock no cruza el SMTP.
  - `markPurchaseQuoteSent(id)` (`update`): `SENT` con `sent_to = []`.
  - `recordPurchaseQuoteResponse(id, values)` (`update`):
    - lock; `canApplyPurchaseQuoteAction(status, 'receive')` y, si ya estaba `RECEIVED`, `!quoteHasOrders`; si no, "La cotización ya tiene una orden de compra: no se puede corregir";
    - las líneas tienen que ser de esta cotización;
    - escribe precios, alícuotas, `not_quoted`, los datos de la respuesta y `RECEIVED`.
  - `uploadPurchaseQuoteAttachment(id, formData)` (`update`):
    - mismo patrón, límites y compensación que `uploadSupplierDocument`;
    - path `${companyId}/${supplierId}/quotes/${Date.now()}-${archivo}` en `supplier-documents`;
    - reemplaza `attachment_path`/`attachment_name`, sin borrar el archivo anterior (historial, como los documentos);
    - `getPurchaseQuoteAttachmentUrl(id)` con perímetro.
  - `declinePurchaseQuote(id)` y `cancelPurchaseQuote(id, reason)` (`update`).
  - `getPurchaseQuoteDetail(id)` (`view`): cabecera, proveedor, líneas con solicitud de origen, totales cotizados (con `computeOrderTotals` sobre las líneas con precio), OC generadas, historial y `can`.
  - `getPurchaseQuotePdf(id)` → `ActionResult<{ filename, base64 }>`.
  - `getRequestQuoteComparison(requestId)`: con `compras:cotizaciones:view` y la visibilidad de la solicitud (`view` propias / `view_all_requests`):
    - columnas = cotizaciones de la solicitud no anuladas: proveedor, estado, plazo, validez (marcando las vencidas) y total con IVA de lo cotizado;
    - filas = líneas de la solicitud, con el unitario de cada proveedor o "no cotiza" / "sin respuesta";
    - `bestQuoteIdByLine`: el menor unitario neto con `compareAmounts`; en un empate, todos.
- Test: `src/features/Purchases/actions/quotes.integration.test.ts`:
  - `requestQuotes` a 2 proveedores → 2 cotizaciones con lo que falta;
  - con una línea ya pedida en parte, la cotización lleva el faltante;
  - **enviar con mail OK** → `SENT`, `sent_to` y un adjunto `application/pdf` en la llamada a `sendMail`;
  - **mail que falla** → sigue `DRAFT` y el error es el del texto (Foco 3);
  - marcar como enviada;
  - cargar la respuesta (una línea "no cotiza") → `RECEIVED`;
  - una respuesta sin ninguna línea con precio → rechazada;
  - corregirla ok; después de generar una OC (`createPurchaseOrderFromQuote`), corregirla falla;
  - la OC desde la cotización copia precios, omite `not_quoted`, toma `min(cotizada, falta)` y, sin faltante, da el mensaje;
  - no cotiza; anular; anular una `RECEIVED` → rechazado;
  - la cotización de otra empresa no se ve;
  - una línea ajena en la respuesta → rechazada;
  - comparativo con el mejor precio marcado y un empate.

**Verificación:** `npm run test:purchases` y `check-types`.

### Task 6: Envío de la OC al proveedor

**Archivos:**
- Modify: `src/features/Purchases/actions/orders.server.ts`:
  - `sendPurchaseOrder(id, { to, message })` (`update`), con el mismo esquema de dos transacciones que `sendPurchaseQuote`: `APPROVED` → mail con el PDF → `SENT`, `sent_at`, `sent_to` y `sent_by`. Si falla: "No se pudo enviar el mail…; la orden sigue aprobada".
  - `markPurchaseOrderSent(id)`: `SENT`, `sent_to = []` y `sent_by`.
  - `getPurchaseOrderSendDefaults(id)`: el mail del contacto principal y de los demás contactos con mail, para el diálogo.
- Modify: `src/shared/lib/mail/templates/purchases.ts` → `buildSupplierDocumentEmail({ kind: 'quote' | 'order', number, companyName, message })`:
  - asunto "Pedido de cotización PC-000003 — {empresa}" u "Orden de compra OC-000007 — {empresa}";
  - cuerpo en texto plano con el mensaje opcional del comprador.
- Test (en `orders.integration.test.ts`):
  - enviar OK, con el adjunto en la llamada;
  - envío que falla → sigue `APPROVED` (Foco 3);
  - enviar una OC `PENDING_APPROVAL` → rechazado;
  - marcar como enviada;
  - anular una `SENT` ok y que libere lo pedido.

**Verificación:** `npm run test:purchases` y `check-types`.

### Task 7: Pantallas (sin DataTables)

**Archivos:**
- Modify: `src/features/Purchases/PurchasesComponent.tsx`: tabs `cotizaciones` y `ordenes`, con `QuotesTabContent` y `OrdersTabContent` server, skeleton propio y `NoPermission`. La tabla interna la arma la Task 8; acá queda el contenedor con el botón "Nuevo pedido de cotización" / "Nueva orden de compra", guardado por permiso.
- Create: `src/features/Purchases/components/DownloadPdfButton.tsx`: recibe una action `() => Promise<ActionResult<{ filename, base64 }>>` y descarga.
- Create: `src/features/Purchases/components/SendToSupplierDialog.tsx`, compartido por la cotización y la OC:
  - destinatarios como checkboxes de los contactos con mail (el principal tildado) + un input para agregar otros;
  - mensaje opcional, botón "Ver PDF" y "Enviar";
  - avisos de documentos vencidos, si los hay (no bloquean);
  - RHF + Zod con `sendDocumentSchema`.
- Create: `src/features/Purchases/components/ExpiredSupplierDocumentsAlert.tsx`: `Alert` ámbar con la lista de documentos vencidos y un link a la ficha del proveedor.
- Create: `src/features/Purchases/Requests/components/RequestQuotesDialog.tsx`:
  - desde el detalle de la solicitud: checkboxes de líneas (por defecto, las que tienen faltante) y un multiselect de proveedores (sugeridos preseleccionados, buscando con `searchSupplierOptions`);
  - al crear, toast "Se crearon N pedidos de cotización" y links.
- Create: `src/features/Purchases/Requests/components/QuoteComparison.tsx`:
  - tabla con `getRequestQuoteComparison`: celdas con unitario y alícuota, la mejor resaltada (`bg-emerald-50 dark:bg-emerald-950` + ícono, con clases escritas completas);
  - pie con total con IVA, plazo y validez por proveedor, y "Generar OC" por columna `RECEIVED` (`createPurchaseOrderFromQuote` → navega a editar la OC);
  - en el teléfono: scroll horizontal dentro de la card, sin desbordar la página.
- Modify: `src/features/Purchases/Requests/components/PurchaseRequestDetailView.tsx` + `PurchaseRequestActions.tsx`:
  - columnas "Pedido en OC" y "Falta" por línea;
  - botones "Pedir cotización", "Generar OC" (a `/dashboard/purchases/orders/new?fromRequest={id}`, con las líneas de la solicitud precargadas) y "Cerrar" (diálogo con motivo);
  - secciones "Cotizaciones" (`QuoteComparison`) y "Órdenes de compra" (lista con número, proveedor, estado y total);
  - el badge de estado suma los estados nuevos (`PurchaseRequestStatusBadge.tsx`, con su color: pedida en parte ámbar, pedida azul, cerrada gris).
- Create: `src/app/dashboard/purchases/quotes/new/page.tsx` y `quotes/[id]/page.tsx` → `src/features/Purchases/Quotes/components/`:
  - `PurchaseQuoteForm.tsx`: proveedor + líneas con `searchOrderableRequestLines`, para el alta desde la tab;
  - `PurchaseQuoteDetailView.tsx`: cabecera, líneas, adjunto, historial y OC generadas;
  - `PurchaseQuoteActions.tsx`: Enviar, Marcar como enviado, Cargar respuesta, No cotiza, Anular, Descargar PDF y Generar OC;
  - `QuoteResponseDialog.tsx`:
    - tabla editable por línea con precio neto, alícuota (select de `VAT_RATE_LABELS`, default 21%) y "No cotiza" (que deshabilita los otros dos);
    - además, fecha de respuesta, validez y plazo (date pickers con escritura directa), notas del proveedor y adjunto (opcional, subido después de guardar la respuesta, en el mismo submit: guardar → subir; si la subida falla, se avisa y la respuesta queda guardada);
  - `PurchaseQuoteStatusBadge.tsx`.
- Create: `src/app/dashboard/purchases/orders/new/page.tsx`, `orders/[id]/page.tsx` y `orders/[id]/edit/page.tsx` → `src/features/Purchases/Orders/components/`:
  - `PurchaseOrderForm.tsx`:
    - proveedor (combo con `searchSupplierOptions`; al elegirlo, aviso de documentos vencidos y plazo de pago precargado);
    - líneas con selector de línea de solicitud (`searchOrderableRequestLines`, mostrando `SC-000012 · línea 2 · Aceite 15W40 · falta 5 l`), cantidad (default: lo que falta), precio neto y alícuota;
    - totales en vivo con `computeOrderTotals`;
    - fecha de entrega con escritura directa, lugar de entrega, plazo de pago y notas;
    - "Guardar borrador" (también con Enter) y "Enviar a aprobación" (onClick, como en la solicitud);
    - con `?fromRequest=` precarga las líneas con faltante de esa solicitud y su proveedor sugerido;
  - `PurchaseOrderDetailView.tsx`:
    - cabecera, condiciones, líneas con link a su solicitud y totales;
    - el motivo del último rechazo destacado si está en `DRAFT` con `rejection_notes`;
    - historial y aviso de documentos vencidos;
  - `PurchaseOrderActions.tsx`: Editar, Enviar a aprobación, Aprobar (diálogo con el aviso de documentos vencidos), Rechazar (motivo), Enviar al proveedor (`SendToSupplierDialog`), Marcar como enviada, Descargar PDF y Anular (motivo);
  - `PurchaseOrderStatusBadge.tsx`.
- Las mutaciones invalidan `PURCHASES_QUERY_KEYS.requests`, `quotes` y `orders`, más `router.refresh()`.

**Verificación:** `check-types` + navegador (dev server reiniciado tras `prisma generate`).

### Task 8: Tablas (agente `table-expert`)

- **Cotizaciones** (`src/features/Purchases/Quotes/QuotesList/`):
  - columnas:
    - número (link), proveedor (FK, faceted), estado (enum faceted) y fecha de alta;
    - enviada y respondida (fechas con dateRange);
    - validez (dateRange; las vencidas marcadas);
    - total cotizado (texto);
    - solicitudes de origen (M:M vía líneas, faceted, con link).
  - Filtros visibles: estado, proveedor y fecha.
- **Órdenes de compra** (`src/features/Purchases/Orders/OrdersList/`):
  - columnas:
    - número, proveedor y estado;
    - fecha de alta, fecha de entrega, total, creó, aprobó y enviada;
    - solicitudes de origen (M:M).
  - Filtros visibles: estado, proveedor y fecha.
- **Solicitudes:** el filtro de estado suma los 3 estados nuevos, con label e ícono iguales al badge; columna "Avance" (`ordered/requested` en porcentaje sobre la suma de líneas, o "—" si no está aprobada), con filtro de texto.
- **Para las tres:** facets lazy (`fetchFacet`), export con formatters, `paramNamespace`, `queryFn` y la query key de `PURCHASES_QUERY_KEYS`.

### Task 9: Demo

- **Archivos:** `scripts/demo/domains/purchases.ts` (amplía `seedPurchases`) y `scripts/demo/lib/wipe.ts` (las 4 tablas nuevas, en orden: líneas de OC → OC → líneas de cotización → cotizaciones, antes que las solicitudes).
- **Contenido** (spec §7):
  - una solicitud aprobada cotizada a 3 proveedores: uno `RECEIVED` con precios, uno `SENT` sin respuesta y uno `DECLINED`;
  - una OC `SENT` desde la más barata, por parte de las líneas, así la solicitud queda `PARTIALLY_ORDERED`;
  - una OC directa `PENDING_APPROVAL` sobre otra solicitud;
  - una OC `DRAFT` con `rejection_notes`;
  - totales calculados con `computeOrderTotals` y números con la numeración real.
- **Verificación:**
  - arnés en transacción descartada (scratchpad): conteos por estado, CHECK respetados, sin pedir de más (Σ ≤ pedido por línea) y estados de solicitud coherentes con `progressStatus`;
  - después, `reset` real contra la base local.

### Task 10: Manual de uso

- Create: `src/content/manual/compras/pedidos-de-cotizacion.mdx`, con el formato de las guías de la etapa 1 (frontmatter, `<OpenScreen />`, `<Flow>`, `<States>`, tablas de botones, Callouts de problemas frecuentes):
  - pedir desde la solicitud o desde la tab;
  - enviar con el PDF o marcar como enviado;
  - cargar la respuesta (no cotiza, adjunto, corregir);
  - comparar y generar la OC;
  - estados;
  - mensajes: "No se pudo enviar el mail…" y "La cotización ya tiene una orden de compra".
- Create: `src/content/manual/compras/ordenes-de-compra.mdx`:
  - circuito y estados;
  - armar una OC: líneas de varias solicitudes, faltante, precios, IVA y totales;
  - desde una cotización;
  - aprobar o rechazar; enviar al proveedor; PDF y marca de borrador;
  - anular; aviso de documentos vencidos;
  - la lista;
  - mensajes: "quedan N", "ya está pedida completa" y el error del mail.
- Modify:
  - `solicitudes-de-compra.mdx`: estados nuevos, "Pedido en OC" y "Falta", Pedir cotización, Generar OC, Cerrar, comparativo y la columna Avance;
  - `compras.mdx`: conceptos (cotización, OC, faltante), las 5 secciones, permisos nuevos, "Lo que viene" sin cotizaciones ni OC, y problemas frecuentes;
  - `proveedores.mdx`: los contactos con mail reciben los pedidos y las OC, y los documentos vencidos avisan en las OC.
- Modify: `src/features/Ayuda/Manual/catalog/sections/compras.ts` (las dos guías nuevas, con la tab que cubren y `related`) y `home.ts` (camino "Comprar": solicitud → cotización → OC).
- **Verificación:** `npm run manual:check` → "sin problemas".

### Task 11: Verificación final

- Comandos (con `NODE_OPTIONS=--max-old-space-size=8192` donde corre `tsc` o el build):
  - `check-types`, `npm test`, `npm run test:db`, `npm run test:purchases`, `npm run test:warehouses` y `npm run manual:check`;
  - **`npx next build`** completo.
- Navegador (spec §5), con Mailpit en `alphataco-mail-test` (21025/28025) y el dev server con `SMTP_*` apuntando ahí:
  1. Desde una solicitud aprobada, pedir cotización a 2 proveedores.
  2. Enviar una por mail (Mailpit: asunto y PDF adjunto) y marcar la otra.
  3. Cargar las respuestas (una con "no cotiza").
  4. Revisar el comparativo con la mejor marcada.
  5. Generar la OC desde la mejor; aviso de documentos vencidos (el proveedor de la etapa 1 tiene uno).
  6. Enviar a aprobación → rechazar → editar → aprobar → enviar al proveedor (Mailpit).
  7. Descargar el PDF en borrador (con marca) y aprobado (sin marca), rasterizados con `mupdf`.
  8. OC directa desde la tab con líneas de dos solicitudes.
  9. Intentar pedir de más (mensaje).
  10. Anular → la solicitud vuelve atrás.
  11. Cerrar una solicitud.
  12. Teléfono (375 px): comparativo y formulario de OC sin scroll horizontal de página.
  - Medir en el DOM, no en screenshots.
- Revisión de calidad: un agente revisor sobre el diff completo de la etapa antes de proponer el commit.
- Commit (con el OK del usuario): una línea, `feat(compras): etapa 2 - pedidos de cotizacion y ordenes de compra con aprobacion y envio al proveedor`, sin `.codex/` ni `AGENTS.md`, sin push.
