# Compras — Etapa 5: cuenta corriente, órdenes de pago y retenciones

**Fecha:** 2026-10-09
**Estado:** diseño aprobado en conversación (2026-10-09)
**Parte de:** `2026-10-08-compras-etapa-1-design.md` (§1, mapa de las 5 etapas). Sigue a `2026-10-09-compras-etapa-4-design.md`. Es la última etapa del módulo: al cerrarla van el push y el PR de Compras a `main`.

Rigen las convenciones de las etapas 1 a 4:
- multiempresa con la empresa resuelta en el servidor;
- `ActionResult`; schemas Zod sin directiva;
- permisos por tab solo para los 3 roles de sistema;
- numeración con advisory lock;
- manual de uso en la misma etapa;
- `next build` antes del PR.

## 1. Objetivo y decisiones

Pagar a los proveedores lo que la etapa 4 dejó "a pagar", practicar las retenciones de ley y llevar la cuenta corriente y los vencimientos de cada proveedor.

| Tema | Decisión |
| ---- | -------- |
| Alcance del pago | **Se registra el pago**: medios, fecha, referencia y cuenta o caja de origen. No hay saldos de banco, chequeras ni conciliación: eso es el **módulo de Tesorería**, que se desarrolla al terminar Compras. |
| Enganche con Tesorería | El catálogo de cuentas y cajas se crea **ya con la forma de Tesorería** (`treasury_accounts`) y cada medio de pago apunta a una cuenta. Tesorería va a generar sus movimientos desde los pagos registrados sin migrar datos. |
| Cuenta corriente | **Derivada de los documentos** (comprobantes, órdenes de pago y sus aplicaciones). No hay tabla de movimientos: una sola fórmula, en SQL, compartida por todas las pantallas. |
| Qué se paga | **Comprobantes total o parcial, con NC aplicadas, y anticipos** sin factura (opcionalmente contra una OC) que quedan a cuenta y se aplican después. |
| Aprobación | **Sí**, con `compras:pagos:approve`, como las OC. |
| Medios | **Varios medios por orden**: transferencia, cheque, e-cheq y efectivo, cada uno desde una cuenta o caja. |
| Retenciones | **Ganancias (RG 830), IVA, IIBB Neuquén y SUSS**, calculadas solas con regímenes cargados en Configuración y la situación de cada proveedor en su ficha, y corregibles a mano. |
| Salidas | **Certificado PDF** por retención, **listado mensual** con Excel y **archivos de importación** (SICORE, SIRE y Rentas Neuquén). |

## 2. Modelo de datos

### 2.1 Cuentas y cajas (catálogo de Tesorería)

- **`treasury_accounts`**: `company_id`, `kind` (`BANK`, `CASH`), `name` (único por empresa), `bank_name?`, `account_number?`, `cbu?`, `is_active`, `created_at`.
- Hoy se administran en **Configuración de Compras**. Tesorería las absorbe tal cual.

### 2.2 Orden de pago

- **`payment_orders`**
  - `company_id`, `number` (**OP-000001**, único por empresa), `supplier_id`;
  - `status` (`payment_order_status`): `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`, `CANCELLED`;
  - `planned_on` (fecha prevista, `DATE`), `paid_on?` (`DATE`), `notes?`;
  - totales (`Decimal(15,2)`): `invoices_total` (facturas y ND aplicadas), `credits_total` (NC y anticipos aplicados), `advance_total` (anticipo nuevo), `withholdings_total`, `net_total` (= facturas + anticipo − créditos − retenciones);
  - `submitted_at?`, `approved_by?`, `approved_at?`, `rejected_by?`, `rejected_at?`, `rejection_notes?` y la tabla `payment_order_rejections` (historial, como las OC);
  - `paid_by?`, `sent_at?`, `sent_to text[]`;
  - anulación: `cancelled_by?`, `cancelled_at?`, `cancel_reason?`;
  - `created_by`, `created_at`, `updated_at`.
- **`payment_order_lines`**: `payment_order_id`, `position`, `kind` (`payment_line_kind`) y `amount` (> 0):
  - `INVOICE`: `invoice_id` (factura o ND) — se paga ese importe;
  - `CREDIT_NOTE`: `invoice_id` (NC) — se aplica ese importe (resta);
  - `ADVANCE`: anticipo nuevo, `purchase_order_id?`, `description?`;
  - `ADVANCE_APPLIED`: `source_line_id` (la línea `ADVANCE` de una orden pagada) — consume ese importe (resta).
- **`payment_order_withholdings`**: `payment_order_id`, `tax` (`withholding_tax`: `GANANCIAS`, `IVA`, `IIBB`, `SUSS`), `regime_id`, `base`, `rate` (`Decimal(7,4)`, porcentaje), `amount` (> 0), `detail` (texto con el cálculo), `manual` (bool), `certificate_number?` (se asigna al pagar), `cancelled_at?` (si se anula la orden pagada).
- **`payment_order_payments`**: `payment_order_id`, `method` (`payment_method`: `TRANSFER`, `CHECK`, `ECHECK`, `CASH`), `treasury_account_id`, `amount` (> 0), `reference?`, `check_number?`, `check_bank?`, `check_due_on?` (`DATE`). Cheque y e-cheq exigen número y fecha.

### 2.3 Retenciones

- **`withholding_regimes`**: `company_id`, `tax`, `code` (código de régimen SICORE/SIRE, 3 dígitos), `description`, `rate_registered` (%), `rate_unregistered?` (%), `monthly_exempt_amount` (mínimo no sujeto mensual, Ganancias), `minimum_withholding` (mínimo a retener), `scale` (`jsonb`, escala de honorarios: `[{ from, to?, fixed, rate }]`), `vat_percentage?` (IVA: porcentaje del IVA a retener), `is_active`. Único `(company_id, tax, code)`.
- **`supplier_withholding_profiles`**: `supplier_id`, `tax`, `status` (`withholding_status`: `SUBJECT`, `NOT_REGISTERED`, `EXEMPT`), `regime_id?` (régimen por defecto), `rate?` (alícuota de padrón, IIBB), `exclusion_percentage?`, `exclusion_from?`, `exclusion_to?`, `exclusion_certificate?`. Único `(supplier_id, tax)`.
- **Numeración de certificados**: correlativa por empresa e impuesto (`GAN-000001`, `IVA-000001`, `IIBB-000001`, `SUSS-000001`), con advisory lock.

### 2.4 Cuenta corriente (sin tabla)

- **Pendiente de un comprobante** = total − Σ `amount` de sus líneas (`INVOICE` o `CREDIT_NOTE`) en órdenes no anuladas. Los borradores cuentan: lo que está en una orden en curso no se ofrece en otra.
- **Disponible de un anticipo** = `amount` de la línea `ADVANCE` (de una orden **pagada**) − Σ `ADVANCE_APPLIED` en órdenes no anuladas.
- **Saldo del proveedor** = facturas y ND a pagar − NC a pagar − pagos de esos comprobantes − anticipos disponibles. Las tres cuentas se definen una sola vez en SQL (`lib/payment-balances.ts`).

### 2.5 CHECK en la base

- Importes > 0 en líneas, retenciones y medios; totales ≥ 0.
- Cada tipo de línea con sus columnas y sin las demás.
- Cheque/e-cheq con número y fecha; anulación completa o vacía; `status = 'PAID'` exige `paid_on`; `status = 'CANCELLED'` exige la anulación.

## 3. Reglas del servidor

### 3.1 Armar y editar (borrador)

- Proveedor activo de la empresa. Las líneas `INVOICE` y `CREDIT_NOTE` son comprobantes "a pagar" (`CONFORMING` o `APPROVED`) de ese proveedor; NC solo como `CREDIT_NOTE`.
- Cada importe no supera el **pendiente** del comprobante (excluyendo la propia orden al editar) ni el **disponible** del anticipo.
- **Neto a pagar** = facturas + anticipo − NC − anticipos aplicados − retenciones; si da < 0, error.
- **Lock**: toda mutación de órdenes de pago lockea primero al **proveedor** (`suppliers FOR UPDATE`): las órdenes del mismo proveedor quedan en fila (pendientes y acumulados del mes).
- Solo se editan borradores. Al editar se reemplazan líneas y retenciones automáticas; las manuales se conservan si sigue el mismo impuesto y régimen.

### 3.2 Retenciones

Se calculan en cada guardado del borrador con `planned_on`. Motor puro por impuesto (`lib/withholdings.ts`); el servidor arma los datos.

- **Base neta** de lo que se paga: por línea `INVOICE`, `amount × (total − IVA − percepciones − otros tributos) / total`; de un anticipo nuevo, su importe. Lo cubierto por NC y anticipos aplicados se descuenta proporcionalmente (un anticipo ya sufrió retención al pagarse).
- **Ganancias**: por régimen (el del perfil del proveedor). Acumulado del mes calendario de `planned_on` = bases de órdenes **pagadas** del proveedor en ese mes y régimen + esta. `SUBJECT`: impuesto = (acumulado − mínimo no sujeto) × alícuota (o escala si el régimen la tiene) − retenido en el mes. `NOT_REGISTERED`: base de esta orden × alícuota de no inscripto, sin mínimo. `EXEMPT`: nada.
- **IVA**: solo a proveedores RI con perfil `SUBJECT`: IVA de los comprobantes pagados (proporcional) × `vat_percentage` del régimen.
- **IIBB Neuquén**: base × alícuota del perfil (padrón), o la del régimen si no tiene.
- **SUSS**: base × alícuota del régimen, solo si el perfil lo tiene.
- **Comunes**: sin perfil o con régimen inactivo, no se retiene ese impuesto. Exclusión vigente a `planned_on`: se reduce en su porcentaje. Menor al mínimo de retención: no se practica. Importes con aritmética escalada (2 decimales).
- **Manual**: se puede corregir el importe de una retención (o agregar una) con un motivo; queda `manual` y el detalle lo dice.

### 3.3 Circuito

- **Enviar a aprobación**: desde `DRAFT`. **Aprobar** (`pagos:approve`): desde `PENDING_APPROVAL`; vuelve a validar pendientes y que los comprobantes sigan "a pagar". **Rechazar** (motivo): vuelve a `DRAFT`.
- **Registrar pago** (`pagos:update`, desde `APPROVED`): fecha real y medios. Cada cuenta activa y de la empresa; Σ medios = neto. Si `paid_on` cae en otro mes que `planned_on`: error ("Las retenciones se calcularon para octubre: volvé la orden a borrador para recalcularlas"). Al pagar: numera los certificados (lock por impuesto) y queda `PAID`.
- **Volver a borrador**: desde `PENDING_APPROVAL` o `APPROVED` (`pagos:update`).
- **Enviar al proveedor**: mail con el PDF de la orden y los certificados (como la OC); guarda `sent_at`/`sent_to`.
- **Anular** (motivo): desde cualquier estado. Si estaba `PAID`, marca sus retenciones anuladas (los números no se reusan). Error si un anticipo de esta orden ya se aplicó en otra orden no anulada.

### 3.4 Impacto en la etapa 4

- Un comprobante con líneas en una orden de pago no anulada **no se edita ni se anula**: "Está en la OP-000012: anulala o sacalo de ahí primero".
- Aprobar o pagar una orden con un comprobante que dejó de estar "a pagar" falla con el nombre del comprobante.

### 3.5 Permisos y perímetro

- `compras:pagos`: `view`, `create` (armar), `update` (editar, enviar a aprobación, volver a borrador, registrar pago, enviar al proveedor, anular), `approve`.
- `compras:retenciones`: `view`.
- Cuentas y regímenes: `config-compras:update`. Perfiles de retención del proveedor: `proveedores:update`.
- Proveedor, comprobantes, anticipos, OC, cuentas y regímenes se validan contra la empresa activa.

## 4. Consultas y salidas

- **Cuenta corriente** (pestaña en la ficha del proveedor, `pagos:view`): movimientos en orden de fecha (comprobantes; órdenes de pago pagadas con su neto y retenciones; anticipos), saldo acumulado, enlaces; arriba saldo, vencido, a vencer y anticipos disponibles; rango de fechas con saldo anterior; Excel.
- **Vencimientos** (sección Pagos): comprobantes con pendiente > 0, con proveedor, comprobante, vencimiento, días (atraso o margen), total, pendiente y órdenes en curso; tildando comprobantes de un mismo proveedor se arma la orden precargada.
- **Órdenes de pago** (sección Pagos): tabla con número, proveedor, fecha prevista y de pago, estado, aplicado, retenciones, neto y cargó; detalle con PDF.
- **Retenciones del mes** (sección Retenciones): por período e impuesto; fecha, certificado, OP, proveedor, CUIT, régimen, base, alícuota, importe; totales por régimen; Excel; archivos:
  - **SICORE** (Ganancias), ancho fijo;
  - **SIRE F.2003** (IVA) y **F.2004** (SUSS);
  - **Rentas Neuquén** (IIBB): con el diseño publicado; **queda marcado para validar con el aplicativo** (no hay instructivo a mano).
- **Certificado de retención** (PDF): agente (empresa, CUIT, IIBB del perfil fiscal), sujeto retenido, régimen, base, alícuota, importe, número y OP; "ANULADO" si corresponde.

## 5. Pantallas

- Menú de Compras: Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, Facturas, **Pagos**, **Retenciones**, Libro IVA, Proveedores, Configuración.
- **Pagos**: vistas Vencimientos y Órdenes de pago; botón **Nueva orden de pago** (`pagos:create`).
- **Formulario de la orden** (un solo formulario): proveedor (saldo y anticipos disponibles), fecha prevista, comprobantes pendientes con tilde e importe editable, NC y anticipos para aplicar, anticipo nuevo, retenciones en vivo (se recalculan con una vista previa del servidor) con corrección manual, neto y un solo Guardar.
- **Detalle**: líneas, retenciones con certificados, medios, historial; Editar, Enviar a aprobación, Aprobar, Rechazar, Volver a borrador, **Registrar pago**, Enviar al proveedor, Descargar PDF, Anular.
- **Registrar pago**: diálogo con fecha real y filas de medios (tipo, cuenta, importe, referencia, datos del cheque); total en vivo contra el neto.
- **Ficha del proveedor**: pestaña **Cuenta corriente** y sección **Situación impositiva**.
- **Configuración**: **Cuentas y cajas** y **Regímenes de retención**.
- **Detalle del comprobante** (etapa 4): Pagado, Pendiente y las órdenes de pago.
- Teléfono: sin scroll horizontal de página.

## 6. Tests

- **Unitarios**: motor de retenciones (mínimos, acumulado, no inscripto, escala, exclusión parcial y total, anticipos, mínimo de retención); neto a pagar; registros SICORE, SIRE y Neuquén (largo exacto).
- **Integración** (`npm run test:purchases`): parcial; NC y anticipo aplicados; dos órdenes concurrentes sobre el mismo comprobante; acumulado de Ganancias entre dos órdenes pagadas del mes; aprobación y pago; pago en otro mes; anular pagada; no anular con anticipo consumido; comprobante aplicado no se edita ni anula; cuenta corriente y saldo; perímetro y permisos.
- **pgTAP**: CHECK nuevos. **Navegador** (375 px incluido). **`next build`**. Revisión final con revisor nuevo.

## 7. Manual de uso

- Guías nuevas: **Órdenes de pago**, **Cuenta corriente y vencimientos**, **Retenciones**.
- Actualizar: Facturas de proveedor, Proveedores (situación impositiva), Configuración de Compras, Cómo funciona Compras ("lo que viene": Tesorería).

## 8. Demo

- Cuentas (dos bancos y una caja) y regímenes con valores de referencia (a revisar contra los vigentes).
- Proveedores con situación impositiva: uno no inscripto en Ganancias, uno con exclusión.
- Órdenes pagadas con retenciones y certificados, una parcial, un anticipo aplicado después, una pendiente de aprobación, y facturas vencidas.

## 9. Fuera de alcance

- **Módulo de Tesorería** (siguiente desarrollo, al terminar Compras): saldos de cuentas y cajas, chequeras, cheques de terceros, conciliación bancaria.
- Pagos en moneda extranjera. Asientos contables. Padrones automáticos (ARCA, Rentas). Percepciones sufridas (ya están en la factura).
