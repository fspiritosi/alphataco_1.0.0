# Compras — Etapa 5 (cuenta corriente, órdenes de pago y retenciones) — Plan de implementación

> **Para quien lo ejecute:** tarea por tarea, en orden, con ejecución nativa y una revisión final de todo el branch con un revisor nuevo. Al terminar: commit de la etapa (una línea), push y PR de la rama `feat/compras-etapa-1` a `main` (lo pidió el usuario: "al finalizar, pr de todo a main").

**Objetivo:** pagar lo que la etapa 4 dejó "a pagar" con órdenes de pago aprobadas (parciales, NC y anticipos, varios medios), practicar retenciones de Ganancias, IVA, IIBB Neuquén y SUSS con certificados y archivos de importación, y llevar la cuenta corriente y los vencimientos por proveedor.

**Arquitectura:** entidades nuevas en `src/features/Purchases/Payments/` y `Withholdings/`. La cuenta corriente se deriva de los documentos con una sola definición SQL (`lib/payment-balances.ts`). Retenciones con un motor puro (`lib/withholdings.ts`) que recibe todo leído. Cuentas y cajas en `treasury_accounts` (forma de Tesorería). Se reusan `nextPurchaseDocumentNumber` (kind `payment`), `toPurchaseActionError`, `ConfirmAction`, `HistoryCard`, `DownloadPdfButton`, `SendToSupplierDialog`, `supplierRecipients`, la infraestructura de PDF de `pdf/` y `invoice-math`.

**Stack:** Next.js 16, Prisma 7 + Postgres, React Query, RHF + Zod, shadcn, Vitest, pgTAP, @react-pdf/renderer, exceljs, jszip.

**Spec:** `docs/superpowers/specs/2026-10-09-compras-etapa-5-design.md` (fuente de verdad).
**Base:** rama `feat/compras-etapa-1`, commit de la etapa 4 (`df09b0d0`).

## Restricciones globales

- Empresa de la sesión; todo id se valida contra ella. Mutaciones con `ActionResult`; errores de negocio `PurchaseError`.
- Importes solo con `invoice-math` (escalado). Nada de `Number` para montos persistidos.
- Orden de locks: **proveedor** (`suppliers FOR UPDATE`) → orden de pago → comprobantes (si hace falta) → numeración (OP, certificados).
- Funciones exportadas de archivos `'use server'` nunca reciben `companyId`; los helpers server-only van en `lib/`.
- Sin `any`, sin `console.*`; moment.js; código en inglés y UI en español; schemas en `schemas/` sin directiva; clases de Tailwind completas.
- Tipos para `next build`: `Pick<Prisma.TransactionClient, …>` en `lib/`; si aparece TS2589 tras un build, borrar `tsconfig.tsbuildinfo` antes de concluir nada.
- Migraciones: carpeta manual + `npx prisma migrate deploy`; enums nuevos en la misma migración; índices parciales en SQL.
- Permisos por migración solo a los 3 roles de sistema; tabs nuevas en `permissions-map.ts`; claves `modulo:tab:accion` cubiertas por `tab-permission-keys.test.ts`.
- DataTables: agente `table-expert`. Botones dentro de `<form>` que no guardan: `type="button"`.
- Verificación: `NODE_OPTIONS=--max-old-space-size=8192 npm run check-types`; `npx next build` antes de cerrar. Prohibido lint/prettier/format.

## Foco de revisión

1. **Dos órdenes simultáneas del mismo proveedor que juntas pagan más que el pendiente de un comprobante**: la segunda falla; nunca se paga dos veces. Task 4.
2. **Acumulado de Ganancias**: la segunda orden pagada del mes descuenta el mínimo ya usado y lo ya retenido; una anulada sale del acumulado. Task 2 y 4.
3. **Anular una orden pagada cuyo anticipo ya se aplicó en otra**: error; y anular libera pendientes. Task 4.
4. **Comprobante de la etapa 4 aplicado en una orden**: no se edita ni se anula. Task 4.
5. **Pagar con fecha de otro mes o con medios que no suman el neto**: error claro, nada guardado. Task 4.

---

### Task 1: Esquema, migraciones y permisos

- **Modify** `prisma/schema.prisma`: enums `payment_order_status`, `payment_line_kind`, `withholding_tax`, `payment_method`, `withholding_status`, `treasury_account_kind`; modelos `treasury_accounts`, `payment_orders`, `payment_order_rejections`, `payment_order_lines`, `payment_order_withholdings`, `payment_order_payments`, `withholding_regimes`, `supplier_withholding_profiles` (spec §2), con relaciones inversas.
- **Create** `prisma/migrations/20261011100000_payment_orders/migration.sql` (diff sin drift + CHECK de la spec §2.5 + único `(company_id, number)` en órdenes y `(company_id, tax, code)` en regímenes, `(company_id, name)` en cuentas) y `20261011100100_purchases_payments_permissions/migration.sql` (tabs `pagos` `…0009` y `retenciones` `…0010`; orden: solicitudes 0, cotizaciones 1, ordenes 2, recepciones 3, facturas 4, pagos 5, retenciones 6, libro-iva 7, proveedores 8, config 9; permisos `pagos` view/create/update/approve, `retenciones` view).
- **Modify** `permissions-map.ts`, `navigation.ts` (íconos `Banknote`, `Percent`), `tab-permission-keys.test.ts` (mínimo 9).
- **Modify** `prisma/tests/03_purchases.sql`: CHECK nuevos.
- **Verificación**: `migrate deploy`, `prisma generate`, `npm run test:db`, `check-types`.

### Task 2: Reglas puras con tests unitarios

- `lib/document-number-format.ts` + `document-number.ts`: kind `payment` → `OP`, tabla `payment_orders`.
- `lib/withholding-certificate-number.ts`: prefijos `GAN`/`IVA`/`IIBB`/`SUSS`.
- `lib/payment-order-state-machine.ts` + test: acciones `submit`, `approve`, `reject`, `back_to_draft`, `pay`, `cancel`, `edit`; labels.
- `lib/payment-totals.ts` + test: `invoiceNetShare(amount, invoiceTotals)`, `computePaymentTotals(lines, withholdings)`.
- `lib/withholdings.ts` + test: `computeWithholdings(input)` por impuesto (spec §3.2) con escala, mínimos, acumulado, no inscripto, exclusión, anticipos.
- `lib/withholding-txt.ts` + test: `sicoreRecord`, `sireRecord` (F.2003/F.2004), `neuquenRecord`, con largos fijos.
- **Verificación**: `npx vitest run src/features/Purchases/lib`.

### Task 3: Configuración y situación impositiva

- Schemas `schemas/treasury-accounts.ts`, `schemas/withholding-regimes.ts`, `schemas/withholding-profiles.ts`.
- Actions `actions/treasury-accounts.server.ts`, `actions/withholding-regimes.server.ts`, `actions/withholding-profiles.server.ts` (perfiles por proveedor: upsert por impuesto).
- UI: `Settings/components/TreasuryAccountsSection.tsx`, `WithholdingRegimesSection.tsx`; `Suppliers/components/SupplierTaxProfile.tsx` en la ficha.
- Test `actions/payments.integration.test.ts` (nuevo, CUIT de prueba `3099999994x`): CRUD de cuentas y regímenes, perfiles, perímetro y permisos.

### Task 4: Órdenes de pago (servidor)

- `lib/payment-balances.ts` (`server-only`): `invoicePending`, `advanceAvailable`, `supplierBalance` — una sola definición SQL.
- `lib/payments.ts`: `lockSupplier`, `lockPaymentOrder`, `loadWithholdingInput`, `assertNotInPaymentOrder` (para la etapa 4).
- `actions/payment-orders.server.ts`: `previewPaymentOrder`, `createPaymentOrder`, `updatePaymentOrder`, `submit/approve/reject/backToDraft`, `registerPayment`, `cancelPaymentOrder`, `sendPaymentOrderToSupplier`, `getPaymentOrderFormData`, `getPaymentOrderDetail`, `downloadPaymentOrderPdf`.
- Etapa 4: `updateSupplierInvoice` y `cancelSupplierInvoice` llaman a `assertNotInPaymentOrder`; detalle del comprobante suma pagado/pendiente/órdenes.
- Tests de integración del Foco de revisión y la spec §6.

### Task 5: Consultas, retenciones y PDFs

- `actions/supplier-account.server.ts`: cuenta corriente con saldo anterior y resumen.
- `actions/withholdings-report.server.ts`: listado mensual, archivos (ZIP), certificado PDF.
- PDF: `pdf/PaymentPdfDocuments.tsx` (orden de pago y certificado) + render.
- Tests: cuenta corriente, listado, largo de los TXT, permisos.

### Task 6: Pantallas

- `Payments/PaymentsTabContent.tsx` (Vencimientos + Órdenes de pago), páginas `/dashboard/purchases/payments/new`, `/[id]`, `/[id]/edit`; formulario, detalle, diálogo de pago.
- `Withholdings/WithholdingsTabContent.tsx` con la vista mensual.
- Ficha del proveedor: pestaña Cuenta corriente y Situación impositiva. Detalle del comprobante: pagado y órdenes.
- Verificación en navegador (375 px incluido).

### Task 7: Tablas (agente `table-expert`)

- Órdenes de pago y Vencimientos (con selección y "Armar orden de pago").

### Task 8: Demo

- `scripts/demo/domains/supplier-payments.ts`: cuentas, regímenes de referencia, perfiles, órdenes (pagadas con certificados, parcial, anticipo aplicado, pendiente de aprobación), vencidas. Arnés en transacción descartada.

### Task 9: Manual

- Guías `ordenes-de-pago.mdx`, `cuenta-corriente-y-vencimientos.mdx`, `retenciones.mdx`; actualizar facturas, proveedores, configuración y compras ("lo que viene": Tesorería); catálogo y `home.ts`; `npm run manual:check`.

### Task 10: Verificación final, commit y PR

- `check-types`, `npm test`, `test:db`, `test:purchases`, `test:warehouses`, `manual:check`, `next build`, navegador.
- Revisión final con revisor nuevo; Critical/Important con test RED→GREEN.
- Commit `feat(compras): etapa 5 - ordenes de pago con retenciones y cuenta corriente de proveedores` (sin `.codex/` ni `AGENTS.md`), push de `feat/compras-etapa-1` y PR a `main` con el resumen de las 5 etapas.
