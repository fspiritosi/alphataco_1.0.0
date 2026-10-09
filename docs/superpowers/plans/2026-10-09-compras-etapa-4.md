# Compras — Etapa 4 (facturas de proveedor y Libro IVA Compras) — Plan de implementación

> **Para quien lo ejecute:** se implementa tarea por tarea, en orden, con ejecución nativa y una revisión final de todo el branch con un revisor nuevo. No se commitea sin pedido explícito del usuario. El commit de la etapa es uno, de una línea, sin push.

**Objetivo:** cargar facturas, ND y NC de proveedor contra OC o como gastos sin OC; controlarlas contra la OC y lo recibido (letra, IVA, precio, alícuota y cantidad), con aprobación de las observadas; constatarlas en ARCA (WSCDC) y llevar el Libro IVA Compras con Excel y los TXT del Libro IVA Digital.

**Arquitectura:** entidad nueva `supplier_invoices` en `src/features/Purchases/Invoices/`. El control vive en un módulo puro (`lib/invoice-control.ts`) que recibe los datos ya leídos; el servidor lockea las OC, lee lo recibido y lo facturado, y llama al control. WSCDC es un cliente SOAP nuevo en `src/shared/lib/arca/wscdc.ts`, detrás del `ArcaGateway` (real y simulado). Se reusan:
- de Facturación: `CBTE_TYPES`, `VAT_RATES`, `RECEIVER_VAT_CONDITIONS`, `invoice-math` y `resolveLetter` / `formatVoucherLabel`;
- de Compras: `lockPurchaseOrder`, `receivedByOrderLine`, `comparePrices`, `toPurchaseActionError`, `ConfirmAction`, `HistoryCard`, `invalidatePurchases`, `SUPPLIER_FILES_BUCKET`.

**Stack:** Next.js 16, Prisma 7 + Postgres, React Query, RHF + Zod, shadcn, Vitest, pgTAP, MinIO, exceljs, jszip.

**Spec:** `docs/superpowers/specs/2026-10-09-compras-etapa-4-design.md` (fuente de verdad).
**Base:** rama `feat/compras-etapa-1`, sobre el commit de la etapa 3 (`4a3681b5`). El push y el PR van recién al cerrar el módulo.

## Restricciones globales

- **Empresa:** sale de la sesión. Proveedor, OC, línea de OC, comprobante vinculado, concepto y provincia se validan contra ella.
- **Mutaciones:** devuelven `ActionResult`. Los errores de negocio son `PurchaseError` y pasan por `toPurchaseActionError`.
- **Importes:** solo con `invoice-math` (`parseScaled`, `formatScaled`, `lineNet`, `vatFor`, `sumAmounts`, `compareAmounts`) y `comparePrices`. Nada de `Number` para plata.
- **Orden de locks:** OC del comprobante (`purchase_orders FOR UPDATE`, ordenadas por id), después el comprobante (`supplier_invoices FOR UPDATE`) al editar, aprobar, rechazar o anular. Las llamadas a ARCA nunca van dentro de una transacción.
- **Código:** sin `any` ni `console.*`; moment.js; código en inglés y UI en español; schemas en `schemas/`, sin directiva; nada de server importando de un módulo `'use client'`.
- **Tipos para `next build`:** las funciones de `lib/` se tipan con `Pick<Prisma.TransactionClient, …>`.
- **Migraciones:** carpeta manual + `npx prisma migrate deploy`. Los enums nuevos van en la misma migración que las tablas (no son `ADD VALUE`).
- **Permisos:** por migración, solo los 3 roles de sistema. Tabs nuevas en `permissions-map.ts`; las claves `modulo:tab:accion` escritas a mano las cubre `tab-permission-keys.test.ts` (cambiar el mínimo a 7 tabs).
- **Shell:** nada de `$var:x` en heredocs de zsh; los archivos se crean con Write.
- **DataTables:** las crea el agente `table-expert`. Botones dentro de `<form>` que no guardan llevan `type="button"`.
- **Verificación:** `NODE_OPTIONS=--max-old-space-size=8192 npm run check-types`; `npx next build` antes de cerrar. Prohibido lint, prettier y format.

## Foco de revisión

1. **Dos comprobantes simultáneos de la misma línea de OC que juntos superan lo recibido:** el segundo ve al primero y queda observado por cantidad; nunca los dos conformes. Task 4.
2. **Editar un comprobante y cambiarle la OC:** se lockean las OC de antes y de después, y el control usa lo facturado sin contar la versión vieja del mismo comprobante. Task 4.
3. **NC que deja lo facturado de una línea por debajo de 0** (o NC de otro proveedor o de otra letra): error, nada guardado. Task 4.
4. **Comprobante C con IVA cargado, o A con una línea sin alícuota:** el schema lo rechaza con un mensaje claro, no llega un `vat_rate_id` nulo a una línea A. Task 3.
5. **Constatación sin respuesta de ARCA o con certificado no habilitado para WSCDC:** el comprobante no cambia de estado y el mensaje dice qué hacer. Task 5.

---

### Task 1: Esquema, migraciones y permisos

- **Modify** `prisma/schema.prisma`:
  - enums `supplier_invoice_status` (`CONFORMING`, `OBSERVED`, `APPROVED`, `REJECTED`, `CANCELLED`), `supplier_invoice_tax_kind` (`VAT_PERCEPTION`, `GROSS_INCOME_PERCEPTION`, `INTERNAL_TAX`, `OTHER_TAX`) y `arca_check_result` (`APPROVED`, `REJECTED`, `UNAVAILABLE`);
  - modelos `supplier_invoices`, `supplier_invoice_lines`, `supplier_invoice_vat`, `supplier_invoice_taxes` y `purchase_expense_categories`, según la spec §2.1:
    - `number BigInt`; `issue_date`, `due_date` y `cae_due_date` `@db.Date`; `vat_period @db.Char(7)`; `observations Json @default("[]")`;
    - `related_invoice_id` self relation (`related_invoice` / `related_notes`), `NoAction`;
    - líneas, alícuotas y tributos a su cabecera con `Cascade`; `order_line_id` y `expense_category_id` `NoAction`;
    - `province_id BigInt?` a `provinces`;
    - `@@unique([company_id, supplier_id, cbte_type, sales_point, number])`;
    - índices por `supplier_id`, `vat_period`, `status`, `order_line_id` y `invoice_id`;
  - relaciones inversas en `company`, `profile` (creó, editó, resolvió y anuló), `suppliers`, `purchase_order_lines`, `provinces`.
- **Create** las migraciones:
  - `prisma/migrations/20261010100000_supplier_invoices/migration.sql`: el diff de Compras (solo lo de esta etapa, sin drift) más los CHECK de la spec §2.3;
  - `prisma/migrations/20261010100100_purchases_invoices_permissions/migration.sql`:
    - tabs `facturas` (`c0000000-0000-0000-0000-000000000007`, "Facturas") y `libro-iva` (`c0000000-0000-0000-0000-000000000008`, "Libro IVA");
    - `order_index` con `ON CONFLICT DO UPDATE`: solicitudes 0, cotizaciones 1, ordenes 2, recepciones 3, facturas 4, libro-iva 5, proveedores 6, config 7;
    - permisos: `facturas` `view`, `create`, `update`, `approve`; `libro-iva` `view`; a los 3 roles.
- **Modify:**
  - `permissions-map.ts`: las 2 tabs, con comentario: en facturas, 'update' edita, anula y constata; 'approve' aprueba o rechaza observadas;
  - `src/features/Layout/sidebar/constants/navigation.ts`: "Facturas" y "Libro IVA" después de "Recepciones";
  - `src/features/Purchases/tab-permission-keys.test.ts`: mínimo de tabs 7.
- **Modify** `prisma/tests/03_purchases.sql`:
  - punto de venta 0; número 0; período `2026-13`;
  - línea con OC y concepto a la vez, y sin ninguno;
  - línea de OC sin cantidad; línea de gasto sin descripción;
  - anulación a medias; `CANCELLED` sin anulación; resolución a medias;
  - IIBB sin provincia; otro tributo sin descripción; tributo en 0;
  - comprobante duplicado.
- **Verificación:** `migrate deploy`, `prisma generate`, `npm run test:db` y `check-types`.

### Task 2: Reglas puras con tests unitarios

- **Create** `lib/invoice-letter.ts` + test:
  - `supplierEmitterCondition(vatConditionId: number): fiscal_tax_condition | null` (1 → RI; 6, 13, 16 → monotributo; 4 → exento; resto → null);
  - `companyReceiverConditionId(taxCondition: fiscal_tax_condition): number` (RI → 1, monotributo → 6, exento → 4);
  - `expectedSupplierLetter({ supplierVatConditionId, supplierName, companyTaxCondition }) → LetterResult` (usa `resolveLetter` con los roles invertidos; mensajes de la spec §3.2);
  - tests: RI+RI → A; RI+monotributo → B; RI+exenta → B; monotributista → C; exento → C; condición 5 → error; empresa sin datos → error.
- **Create** `lib/invoice-totals.ts` + test:
  - `computeInvoiceLine({ letter, quantity?, unitPrice?, net?, vatRateId }) → { netTotal, vatAmount }` (en C, `vatAmount = '0.00'`);
  - `vatBreakdown(lines) → { vatRateId, base, amount }[]` (suma por alícuota, ordenado por id);
  - `computeInvoiceTotals({ lines, vat, untaxed, exempt, taxes }) → { netTaxed, netUntaxed, exempt, vatTotal, vatPerceptions, grossIncomePerceptions, otherTaxes, total }`;
  - `vatDifferences(vat: { vatRateId, base, amount }[]) → { vatRateId, informed, computed }[]` con tolerancia de $1 (`VAT_TOLERANCE = '1.00'`);
  - tests: factura A con dos alícuotas; C sin IVA; percepciones e internos en el total; diferencia de $0,99 no observa y de $1,01 sí.
- **Create** `lib/invoice-control.ts` + test. Puro: recibe todo leído.
  - Tipos: `InvoiceControlInput = { kind: VoucherKind; letter; expectedLetter: LetterResult; vatDifferences; lines: { lineId?; label; orderNumber?; supplierMatches; orderStatus?; quantity; unitPrice; vatRateId; orderPrice?; orderVatRateId?; invoicedOthers; received; unit }[] }`;
  - `controlSupplierInvoice(input) → { errors: string[]; observations: { code: 'LETTER' | 'VAT' | 'PRICE' | 'VAT_RATE' | 'QUANTITY' | 'ARCA'; message: string; lineId?: string }[] }`;
  - reglas de la spec §3.3: proveedor distinto y OC no aprobada → error; NC → resta y error si el neto queda < 0; factura/ND → `invoicedOthers + quantity > received` observa;
  - mensajes con `formatQuantityWithUnit` y montos con formato argentino;
  - tests: cada observación, cada error, NC que libera, línea de gasto (sin controles de OC).
- **Create** `lib/vat-book-txt.ts` + test:
  - `cbteRecord(row) → string` (325) y `vatRecords(row) → string[]` (84 c/u), con los campos de la spec §3.6 (fecha `YYYYMMDD`, tipo 3, PV 5, número 20, despacho 16 en blanco, código doc 80, CUIT 20, nombre 30, 8 importes de 15, moneda `PES`, cambio `0001000000`, cantidad de alícuotas 1, código de operación 1 (ver abajo), crédito fiscal computable 15, otros tributos 15, CUIT corredor 11 ceros, denominación 30 blancos, IVA comisión 15 ceros);
  - código de operación: `0` si el comprobante tiene neto gravado; si no, `E` cuando solo hay exento y `N` cuando solo hay no gravado; en C, `0` con cantidad de alícuotas 0;
  - `amount15(value: string)`: positivo, sin punto, 2 decimales implícitos, ceros a la izquierda;
  - `vatBookTxtFiles(rows) → { cbte: string; alicuotas: string }` con `\r\n` entre registros;
  - tests: largo exacto de cada registro; nombre con tildes recortado a 30 (sin multibyte: se normaliza NFD y se quitan diacríticos); importe `1234.5` → `000000000123450`; C sin registros de alícuotas; NC con importes positivos y tipo 3/8/13.
- **Create** `lib/invoice-status.ts`: `SUPPLIER_INVOICE_STATUS_LABELS` (Conforme, Observada, Aprobada, Rechazada, Anulada), `ARCA_CHECK_LABELS`, `isPayableInvoiceStatus(status)` (`CONFORMING` o `APPROVED`) y el componente `Invoices/components/SupplierInvoiceStatusBadge.tsx` con íconos y clases escritas completas (`CircleCheck` verde, `TriangleAlert` ámbar, `BadgeCheck` azul, `CircleX` rojo, `Ban` gris).
- **Verificación:** `npx vitest run src/features/Purchases/lib` y `check-types`.

### Task 3: Schemas y conceptos de gasto

- **Create** `schemas/invoices.ts`:
  - `supplierInvoiceFormSchema`:
    - `supplierId`, `cbteType` (ids de `CBTE_TYPES` habilitados), `salesPoint` (1–99999), `number` (1–99999999), `issueDate`, `dueDate?`, `vatPeriod` (`YYYY-MM`), `cae?` (14 dígitos), `caeDueDate?`, `relatedInvoiceId?`, `notes?`;
    - `lines: { orderLineId?; expenseCategoryId?; description?; quantity?; unitPrice?; net?; vatRateId? }[]` (al menos una);
    - `vat: { vatRateId; amount }[]`; `untaxed`, `exempt`; `taxes: { kind; provinceId?; description?; amount }[]`;
    - `superRefine`: decimales con `parseScaled`; línea de OC o de gasto; en A y B toda línea con alícuota, en C ninguna y `vat` vacío; IIBB con provincia; otro tributo con descripción; vencimiento ≥ emisión; período ≥ mes de emisión; vinculado solo en NC/ND;
  - `toSupplierInvoiceInput(values)`;
  - adjunto: `INVOICE_ATTACHMENT_MAX_BYTES` / `TYPES` (PDF e imágenes), iguales a los de la recepción.
  - Test del schema: C con IVA → error con mensaje; A sin alícuota → error; período anterior → error.
- **Create** `schemas/expense-categories.ts` (nombre 1–80).
- **Create** `actions/expense-categories.server.ts` (`'use server'`): `getExpenseCategories()` (`config-compras:view` o `facturas:create`), `createExpenseCategory(name)`, `renameExpenseCategory(id, name)`, `setExpenseCategoryActive(id, active)` (`config-compras:update`). Nombre duplicado (sin mayúsculas) → "Ya existe el concepto «Luz»".
- **Create** `Settings/components/ExpenseCategoriesSection.tsx`, con el mismo patrón que `SupplierCategoriesSection`, y sumarlo en `SettingsTabContent.tsx`.
- **Test** en `actions/invoices.integration.test.ts` (archivo nuevo, ver Task 4): alta, duplicado, renombrar, desactivar, perímetro.
- **Verificación:** `npx vitest run src/features/Purchases/schemas` y `check-types`.

### Task 4: Comprobantes (servidor)

- **Create** `lib/invoices.ts` (`server-only`):
  - `lockSupplierInvoice(tx, companyId, id)`;
  - `lockOrdersForLines(tx, companyId, orderLineIds)`: busca las OC de esas líneas (de la empresa), las ordena por id y llama a `lockPurchaseOrder` de cada una;
  - `invoicedByOrderLine(tx, orderLineIds, { excludeInvoiceId? }) → Map<string, string>`: Σ factura/ND − Σ NC de comprobantes no anulados ni rechazados. Una sola consulta SQL, que también usa el detalle de la OC (lección del 712: una sola definición);
  - `loadInvoiceControlData(tx, companyId, input, { excludeInvoiceId? })`: proveedor (con condición de IVA), perfil fiscal de la empresa, líneas de OC (OC, estado, proveedor, precio, alícuota, unidad, ítem), recibido (`receivedByOrderLine`) y facturado; devuelve el `InvoiceControlInput`.
- **Create** `actions/invoices.server.ts` (`'use server'`):
  - `createSupplierInvoice(values)` (`facturas:create`), en una transacción:
    1. proveedor activo de la empresa; duplicado vigente → error con `formatVoucherLabel`;
    2. vinculado: factura vigente del mismo proveedor y la misma letra;
    3. `lockOrdersForLines`; `loadInvoiceControlData`; `controlSupplierInvoice`; errores → `PurchaseError`;
    4. totales con `invoice-totals`; inserta cabecera, líneas, alícuotas y tributos; `status` = `CONFORMING` u `OBSERVED`; `observations`;
    5. devuelve `{ id, label, status, observations }`.
  - `updateSupplierInvoice(id, values)` (`facturas:update`): lock de las OC de antes y de después (unión, ordenadas), lock del comprobante (vigente), mismas validaciones con `excludeInvoiceId`, reemplaza líneas/alícuotas/tributos, borra la resolución, vuelve a controlar.
  - `uploadSupplierInvoiceAttachment(id, formData)` (`facturas:create` o `update`): mismo patrón que la recepción, ruta `<companyId>/<supplierId>/invoices/`.
  - `approveSupplierInvoice(id, comment)` y `rejectSupplierInvoice(id, reason)` (`facturas:approve`): solo desde `OBSERVED`.
  - `cancelSupplierInvoice(id, reason)` (`facturas:update`): con NC/ND vinculadas vigentes → error de la spec §3.4.
  - `getSupplierInvoiceFormData(supplierId?)` (`facturas:create`): proveedores activos (con condición de IVA y letra esperada), conceptos activos, provincias y, si hay proveedor, sus OC con líneas facturables (recibido − facturado > 0) con precio y alícuota.
  - `getSupplierInvoiceDetail(id)` (`facturas:view`): todo lo de la spec §4, observaciones por línea, vinculados, adjunto (`buildStorageFileUrl`), historial y `can.{edit,approve,cancel,check}`.
- **Modify** `actions/orders.server.ts` → `getPurchaseOrderDetail`: por línea `invoiced` (de `invoicedByOrderLine`), e `invoices: { id, label, issueDate, total, status }[]`.
- **Modify:**
  - `lib/query-keys.ts`: `invoices: ['supplier-invoices']`, `vatBook: ['purchases-vat-book']`, `expenseCategories: ['purchase-expense-categories']`;
  - `lib/invalidate.ts`: suma `invoices` y `vatBook`;
  - `scripts/test-purchases.sh`: suma `invoices.integration.test.ts`.
- **Test** `actions/invoices.integration.test.ts`, con sesión, permisos y tenant mockeados. Datos propios: perfil fiscal RI, proveedor RI y uno monotributista, solicitud aprobada → OC enviada → recepción de 10 u (con las actions de las etapas anteriores).
  - conforme: factura A de 10 u al precio de la OC;
  - observaciones: letra (B a un RI), IVA (+$5), precio, alícuota, cantidad (12 u con 10 recibidas);
  - errores: proveedor distinto de la OC, OC en borrador, duplicado, NC por más de lo facturado;
  - aprobar con comentario; rechazar con motivo; aprobar un conforme → rechazado; sin `approve` → rechazado;
  - NC de 2 u vinculada → la factura siguiente de 2 u queda conforme;
  - rechazado no cuenta como facturado; anular libera; duplicado de un anulado se carga; no se anula con NC vinculada;
  - **concurrencia:** dos `createSupplierInvoice` de 6 u en paralelo sobre 10 recibidas → una conforme y otra observada por cantidad;
  - **edición:** pasar una línea a otra OC → la OC vieja libera y la nueva controla;
  - solo gastos (factura C del monotributista) y mixto;
  - el detalle de la OC muestra el facturado;
  - perímetro: proveedor, OC, vinculado y concepto de otra empresa.
- **Verificación:** `npm run test:purchases` y `check-types`.

### Task 5: Constatación en ARCA (WSCDC)

- **Modify** `src/shared/lib/arca/endpoints.ts`: `wscdc` por ambiente (homologación `https://wswhomo.afip.gov.ar/WSCDC/service.asmx`, producción `https://servicios1.afip.gov.ar/WSCDC/service.asmx`) y `WSCDC_NAMESPACE = 'http://servicios1.afip.gob.ar/wscdc/'`.
- **Modify** `src/shared/lib/arca/server/session.ts`: `getArcaSession(companyId, env, { invoiceId?, service = 'wsfe' })` e `invalidateArcaToken(companyId, env, service = 'wsfe')`: el servicio se usa en el ticket, el lease y la fila de `arca_tokens`. Los llamadores actuales no cambian.
- **Create** `src/shared/lib/arca/wscdc.ts` + test:
  - `buildConstatarXml(auth, req: VoucherCheckRequest) → string` (`CbteModo='CAE'`, `CuitEmisor`, `PtoVta`, `CbteTipo`, `CbteNro`, `CbteFch` `YYYYMMDD`, `ImpTotal`, `CodAutorizacion`, `DocTipoReceptor=80`, `DocNroReceptor`);
  - `parseConstatarResponse(xml) → { result: 'A' | 'R'; observations: ArcaMessage[]; errors: ArcaMessage[] }` (con `soapBody`, `messages`);
  - `checkVoucher(ctx, auth, req)` con `soapPost`;
  - test sin red: XML armado; respuesta aprobada; rechazada con observaciones; error 600 de ticket (`ArcaServiceError.isInvalidToken`).
- **Modify** `src/shared/lib/arca/server/gateway.ts`: `checkVoucher(req)` en la interfaz; real con su propia sesión `wscdc` y `withTokenRetry`; mock según `ARCA_MOCK_SCENARIO` (`reject` → R con la observación "Simulación: …", `timeout` → `ArcaTransportError`).
- **Modify** `actions/invoices.server.ts`: `checkSupplierInvoiceInArca(id)` (`facturas:update`):
  1. lee el comprobante (sin lock); exige CAE; arma el pedido con el CUIT de la empresa;
  2. llama al gateway **fuera** de la transacción;
  3. en una transacción corta: lock del comprobante (vigente), guarda resultado, fecha y detalle; `R` agrega la observación `ARCA` y pasa a `OBSERVED` (borra la resolución);
  4. transporte → `UNAVAILABLE`, sin cambio de estado, y el mensaje "ARCA no respondió: probá de nuevo más tarde";
  5. ticket rechazado por servicio no autorizado → "El certificado de la empresa no tiene habilitado el servicio Constatación de comprobantes (wscdc). Asociálo en ARCA → Administración de certificados digitales".
- **Test** (en `invoices.integration.test.ts`, con `ARCA_MODE=mock`): aprobada; `reject` → `OBSERVED` y la observación; `timeout` → `UNAVAILABLE` y el estado no cambia; sin CAE → error.
- **Verificación:** `npx vitest run src/shared/lib/arca`, `npm run test:purchases` y `check-types`.

### Task 6: Libro IVA Compras (servidor)

- **Create** `actions/vat-book.server.ts` (`'use server'`, `libro-iva:view`):
  - `getPurchasesVatBook(period: string)`: filas (comprobantes vigentes del período, orden fecha + comprobante) con importes con signo (NC negativas), columnas de alícuota usadas y totales;
  - `getPurchasesVatBookPeriods()`: los períodos con comprobantes (para el selector), más el mes actual;
  - `exportPurchasesVatBookTxt(period)`: arma los dos archivos con `vatBookTxtFiles`, los empaqueta con jszip y devuelve base64 + nombre (`LIBRO_IVA_COMPRAS_2026-10.zip`). La validación del período es `YYYY-MM`.
- **Test** (en `invoices.integration.test.ts`): totales del período con una NC restando; columnas de alícuota; el ZIP trae 2 archivos con la cantidad de registros esperada y cada línea del largo justo; sin permiso → rechazado.
- **Verificación:** `npm run test:purchases` y `check-types`.

### Task 7: Pantallas

- **Modify** `PurchasesComponent.tsx`: tabs `facturas` → `Invoices/InvoicesTabContent.tsx` (botón **Cargar comprobante** con `facturas:create`; la tabla la arma la Task 8) y `libro-iva` → `VatBook/VatBookTabContent.tsx`. Skeletons en `fallback/`.
- **Create** `src/app/dashboard/purchases/invoices/new/page.tsx`, `invoices/[id]/page.tsx` e `invoices/[id]/edit/page.tsx` → `src/features/Purchases/Invoices/InvoicePages.tsx`.
- **Create** `Invoices/components/`:
  - `SupplierInvoiceForm.tsx` (alta y edición):
    - datos: proveedor (`SearchCombobox`, muestra condición y letra esperada), tipo (filtrado por la letra esperada, pero se puede elegir otra: queda observada), PV y número, fechas con `EnhancedDatePicker`, período (`<Input type="month">`), CAE y vencimiento, vinculado (combo de facturas del proveedor, solo en NC/ND), PDF;
    - líneas con `useFieldArray`: **Agregar desde OC** (diálogo con las OC del proveedor y sus líneas facturables, tilde por línea) y **Agregar gasto**; en la fila, aviso si el precio o la alícuota difieren de la OC;
    - IVA por alícuota derivado de las líneas, con el importe editable (si el usuario lo tocó, se conserva al cambiar líneas solo para esa alícuota);
    - tributos con `useFieldArray`; no gravado y exento;
    - total en vivo con `invoice-totals`; un solo **Guardar**; toast de la spec §4;
  - `SupplierInvoiceDetailView.tsx` y `SupplierInvoiceActions.tsx`: Editar, Constatar en ARCA, Aprobar (`ConfirmAction` con comentario), Rechazar (con motivo), Anular (con motivo).
- **Create** `VatBook/components/VatBookView.tsx`: selector de período, tabla con scroll dentro de la tarjeta y fila de totales, **Exportar Excel** (exceljs en el cliente, con los mismos datos) y **Descargar TXT**.
- **Modify** `Orders/components/PurchaseOrderDetailView.tsx`: columna **Facturado** (en estados con recepción) y sección **Comprobantes** con enlace.
- **Verificación:** `check-types` + navegador (dev server reiniciado tras `prisma generate`).

### Task 8: Tabla (agente `table-expert`)

- **Facturas** (`Invoices/InvoicesList/`):
  - columnas: comprobante (tipo + PV-número, link), fecha de emisión, proveedor, CUIT, período, total, vencimiento, estado, constatación, OC vinculadas (M:M vía `lines.order_line.order`) y cargó;
  - facets lazy, export "Facturas de proveedor", `PURCHASES_QUERY_KEYS.invoices`;
  - estados con labels e íconos de `lib/invoice-status.ts` (Task 2).

### Task 9: Demo

- **Modify** `scripts/demo/domains/purchases.ts`: después de las recepciones de la etapa 3, con el perfil fiscal de la empresa demo (RI):
  - facturas A conformes de las OC recibidas;
  - una observada por precio y otra aprobada con comentario;
  - una NC vinculada a una factura;
  - gastos sin OC (luz, honorarios) con sus conceptos, uno de un monotributista (C);
  - percepciones de IVA y de IIBB en el período actual.
- La demo replica las reglas del control con las funciones puras de `lib/` (no puede usar las actions).
- **Verificación:** arnés en transacción descartada (scratchpad): facturado ≤ recibido en los conformes; totales = suma de los componentes; el Libro IVA del período sale sin error y el TXT tiene el largo justo.

### Task 10: Manual de uso

- **Create** `src/content/manual/compras/facturas-de-proveedor.mdx`: cargar contra OC y gastos; letra esperada; IVA y tributos; observaciones y qué significa cada una; aprobar y rechazar; NC y ND; constatar en ARCA (y el certificado); anular; la lista.
- **Create** `src/content/manual/compras/libro-iva-compras.mdx`: período, columnas, NC, Excel y TXT (cómo se importan en el Libro IVA Digital).
- **Modify:**
  - `ordenes-de-compra.mdx`: Facturado y Comprobantes;
  - `compras.mdx`: secciones, permisos y "lo que viene";
  - la guía de Configuración de Compras (o la sección de `compras.mdx` que la cubra): conceptos de gasto.
- **Modify** `catalog/sections/compras.ts` (las 2 guías, tabs y `/dashboard/purchases/invoices/*`) y `home.ts`.
- **Verificación:** `npm run manual:check`.

### Task 11: Verificación final

- Comandos (con 8 GB donde corre `tsc` o el build):
  - `check-types`, `npm test`, `npm run test:db`, `npm run test:purchases`, `npm run test:warehouses` y `npm run manual:check`;
  - `npx next build`.
- Navegador:
  - cargar una factura contra OC con diferencia de precio → observada → aprobar;
  - NC vinculada; gasto sin OC de un monotributista;
  - constatar (simulado) aprobada y rechazada;
  - Libro IVA del período con Excel y TXT (abrir el ZIP y medir el largo de las líneas);
  - el detalle de la OC con Facturado;
  - conceptos de gasto en Configuración;
  - botones de crear de las tabs nuevas;
  - 375 px sin scroll horizontal en el formulario y el detalle. Medir en el DOM.
- Revisión final del branch con un revisor nuevo (modelo más capaz). Se arreglan los Critical/Important con test RED→GREEN.
- Commit (con el OK del usuario): `feat(compras): etapa 4 - facturas de proveedor con control contra oc y libro iva compras`, sin `.codex/` ni `AGENTS.md`, sin push.
