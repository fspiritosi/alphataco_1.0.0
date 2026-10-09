# Compras — Etapa 4: facturas de proveedor y Libro IVA Compras

**Fecha:** 2026-10-09
**Estado:** diseño aprobado en conversación (2026-10-09)
**Parte de:** `2026-10-08-compras-etapa-1-design.md` (§1, mapa de las 5 etapas). Sigue a `2026-10-09-compras-etapa-3-design.md`.

Rigen las convenciones de las etapas 1 a 3:
- multiempresa con la empresa resuelta en el servidor;
- `ActionResult`; schemas Zod sin directiva;
- permisos por tab solo para los 3 roles de sistema;
- manual de uso en la misma etapa;
- `next build` antes del PR.

## 1. Objetivo y decisiones

Cargar los comprobantes que emite el proveedor (facturas, notas de débito y de crédito), controlarlos contra la OC y lo recibido, y llevar el Libro IVA Compras del período con los archivos para ARCA. Lo que esta etapa deja "a pagar" es la entrada de la etapa 5.

| Tema | Decisión |
| ---- | -------- |
| Arquitectura | **Entidad propia de Compras** (`supplier_invoices`). Reusa de Facturación los catálogos de ARCA (`CBTE_TYPES`, `VAT_RATES`, `RECEIVER_VAT_CONDITIONS`), `invoice-math` y `resolveLetter`, pero no su modelo ni su máquina de estados: una factura recibida no se emite ni se numera. |
| Qué se factura | **Contra OC y también sin OC.** Las líneas sin OC son gastos (servicios públicos, honorarios, fletes sueltos) con un concepto de gasto. Un mismo comprobante puede mezclar las dos. |
| Diferencias contra la OC | **Se carga igual y queda observada.** Quien tiene permiso de aprobar la aprueba (con comentario) o la rechaza (con motivo). |
| Tributos | Percepciones de IVA, percepciones de IIBB (por jurisdicción), impuestos internos y otros tributos, conceptos no gravados y exentos. |
| Libro IVA | **Libro IVA Compras en pantalla y Excel, más los archivos TXT del Libro IVA Digital** (comprobantes y alícuotas). |
| Notas de crédito y débito | **Vinculadas a la factura** que corrigen (opcional para ND, recomendado para NC). La NC de una línea de OC libera lo facturado. |
| Constatación | **Botón "Constatar en ARCA"** (WSCDC) con el certificado de la empresa. |

## 2. Modelo de datos

### 2.1 Comprobante

- **`supplier_invoices`**
  - `company_id`, `supplier_id`;
  - `cbte_type` (Int, de `CBTE_TYPES`: 1/2/3 A, 6/7/8 B, 11/12/13 C), `sales_point` (Int, 1–99999), `number` (BigInt, 1–99999999);
  - `issue_date` y `due_date?` (vencimiento del pago), los dos `DATE`;
  - `vat_period` (`CHAR(7)`, `YYYY-MM`): por defecto el mes de emisión, editable (un comprobante que llega tarde se imputa a otro mes);
  - `cae?` (14 dígitos) y `cae_due_date?`;
  - importes (`Decimal(15,2)`, ≥ 0): `net_taxed`, `net_untaxed` (no gravado), `exempt`, `vat_total`, `vat_perceptions`, `gross_income_perceptions`, `other_taxes` y `total`. Los calcula el servidor desde las líneas, las alícuotas y los tributos;
  - `related_invoice_id?`: la factura que corrige una NC o ND, del mismo proveedor;
  - `status` (`supplier_invoice_status`): `CONFORMING`, `OBSERVED`, `APPROVED`, `REJECTED`, `CANCELLED`;
  - `observations` (`jsonb`): la lista de diferencias que encontró el último control, `[{ code, message, lineId? }]`;
  - resolución: `resolved_by?`, `resolved_at?`, `resolution_comment?` (aprobación o rechazo);
  - anulación: `cancelled_by?`, `cancelled_at?`, `cancel_reason?`;
  - constatación: `arca_check_result?` (`APPROVED`, `REJECTED`, `UNAVAILABLE`), `arca_checked_at?`, `arca_check_detail?` (texto con las observaciones de ARCA);
  - `attachment_path?` y `attachment_name?` (el PDF, en `supplier-documents`: `<companyId>/<supplierId>/invoices/<archivo>`), `notes?`;
  - `created_by`, `created_at`, `updated_by?`, `updated_at`;
  - único `(company_id, supplier_id, cbte_type, sales_point, number)`.
- **`supplier_invoice_lines`**: `invoice_id`, `position`, y uno de dos tipos:
  - **de OC:** `order_line_id` (FK a `purchase_order_lines`), `quantity` (> 0, 4 decimales), `unit_price` (neto, 4 decimales);
  - **de gasto:** `expense_category_id` (FK a `purchase_expense_categories`) y `description`;
  - las dos: `vat_rate_id` (de `VAT_RATES`), `net_total` y `vat_amount`. En un comprobante C, `vat_rate_id` es nulo y `vat_amount` es 0: el precio incluye todo.
- **`supplier_invoice_vat`**: `invoice_id`, `vat_rate_id`, `base`, `amount`. Una fila por alícuota; único `(invoice_id, vat_rate_id)`. Es lo que va al Libro IVA.
- **`supplier_invoice_taxes`**: `invoice_id`, `kind` (`supplier_invoice_tax_kind`: `VAT_PERCEPTION`, `GROSS_INCOME_PERCEPTION`, `INTERNAL_TAX`, `OTHER_TAX`), `province_id?` (obligatoria para IIBB), `description?` (obligatoria para otros tributos), `amount` (> 0).
- **`purchase_expense_categories`**: `company_id`, `name` (único por empresa, sin distinguir mayúsculas), `is_active`. Se administran en Configuración de Compras.

### 2.2 Estados

- Al **guardar** (alta o edición), el servidor corre el control (§3.3) y deja `CONFORMING` (sin diferencias) u `OBSERVED` (con la lista).
- `OBSERVED` → `APPROVED` (con comentario) o `REJECTED` (con motivo), con `compras:facturas:approve`.
- Editar un `APPROVED` o `REJECTED` vuelve a correr el control y borra la resolución.
- `CANCELLED`: desde cualquier estado, con motivo y `compras:facturas:update`. No hay vuelta atrás.
- **"A pagar"** (para la etapa 5) = `CONFORMING` o `APPROVED`.
- **Vigente** = no anulado. Los comprobantes rechazados son vigentes para el control de duplicados y el Libro IVA (el proveedor los emitió; el rechazo es una decisión interna de no pagarlos tal cual), pero **no** cuentan como facturado contra la OC.

### 2.3 CHECK en la base

- `sales_point` entre 1 y 99999; `number` entre 1 y 99999999; `vat_period` con formato `YYYY-MM`.
- Importes ≥ 0; cantidades > 0; montos de tributos > 0.
- Línea de OC o de gasto, nunca las dos ni ninguna: `(order_line_id IS NULL) <> (expense_category_id IS NULL)`; la de OC exige `quantity` y `unit_price`; la de gasto exige `description`.
- Anulación completa o vacía; resolución completa o vacía; `status = 'CANCELLED'` exige la anulación.
- Tributo IIBB con provincia; otro tributo con descripción.

## 3. Reglas del servidor

### 3.1 Alta y edición

- El proveedor tiene que ser de la empresa y estar activo. La línea de OC, de una OC de ese proveedor y de la empresa.
- **Duplicado:** si ya hay un comprobante vigente con el mismo proveedor, tipo, punto de venta y número: "Ya está cargada la Factura A 00003-00012345 de Repuestos del Sur". Un anulado no cuenta: se puede volver a cargar.
- **NC y ND:** `related_invoice_id` opcional, tiene que ser una factura vigente del mismo proveedor y la misma letra.
- **Fechas:** emisión no futura; vencimiento ≥ emisión; `vat_period` no anterior al mes de emisión.
- **Totales:** `total = net_taxed + net_untaxed + exempt + vat_total + vat_perceptions + gross_income_perceptions + other_taxes`, con la aritmética de `invoice-math` (2 decimales). El formulario muestra el total en vivo; el servidor lo recalcula y es el que vale.
- **IVA por alícuota:** el formulario precarga `supplier_invoice_vat` sumando las líneas por alícuota. El usuario puede corregir el importe de IVA de una alícuota (el proveedor redondeó distinto). Las bases no se editan: salen de las líneas.
- **Editar:** solo vigentes. Reemplaza líneas, alícuotas y tributos, y vuelve a correr el control. Toda edición y control se hacen en una transacción con el lock de las OC tocadas (antes y después de la edición).
- **Adjunto:** el PDF se sube en el mismo submit (guardar → subir; si la subida falla, aviso y el comprobante queda), igual que en recepciones.

### 3.2 Letra esperada

- La letra la decide el emisor (el proveedor) frente al receptor (la empresa). Se usa `resolveLetter` de Facturación con los roles invertidos:
  - emisor = condición del proveedor: RI (1) → `responsable_inscripto`; monotributo (6, 13, 16) → `monotributo`; exento (4) → `exento`;
  - receptor = la condición de la empresa (`company_fiscal_profiles.tax_condition`): RI → 1, monotributo → 6, exento → 4.
- Resultado: proveedor RI + empresa RI o monotributista → A (RG 5003, la misma regla del catálogo que usa Facturación); proveedor RI + empresa exenta → B; proveedor monotributista o exento → C.
- Si la condición del proveedor no es ninguna de esas, o la empresa no tiene datos fiscales, no se controla la letra y se observa "No se pudo controlar la letra: …".
- Letra distinta de la esperada → observación `LETTER`: "Repuestos del Sur es Responsable Inscripto: se esperaba Factura A".

### 3.3 Control

Corre al guardar, sobre el comprobante completo. Cada diferencia es una observación con código y mensaje.

- **Letra** (§3.2).
- **IVA:** en A y B, si el IVA de una alícuota difiere en más de $1 de base × alícuota → `VAT`: "IVA 21%: informado $2.105,00, calculado $2.100,00". En C no hay IVA discriminado.
- **Por línea de OC:**
  - proveedor distinto del de la OC → **error** (no se guarda);
  - OC anulada o en borrador/pendiente de aprobación → **error**: "La OC-000007 no está aprobada";
  - precio distinto del de la OC (comparado a 4 decimales con `comparePrices`) → `PRICE`: "Filtro de aceite: precio $1.250,00, en la OC-000007 $1.200,00";
  - alícuota distinta de la de la OC → `VAT_RATE`;
  - **cantidad:** facturado de la línea = Σ de las líneas de facturas y ND vigentes, no rechazadas, menos Σ de las NC vigentes no rechazadas, incluyendo este comprobante. Si supera lo recibido en recepciones vigentes → `QUANTITY`: "Filtro de aceite: facturado 12 u, recibido 10 u en la OC-000007".
- Las OC del comprobante se lockean `FOR UPDATE` (orden por id) antes de calcular lo facturado. Dos comprobantes simultáneos de la misma OC quedan en fila y el segundo ve al primero.
- Las líneas de gasto solo pasan por letra e IVA.
- **Una NC** no se observa por cantidad: libera lo facturado de la línea. Su cantidad no puede dejar lo facturado neto por debajo de 0 → **error**.
- Anular un comprobante libera lo que tenía facturado. No recalcula otros comprobantes (las observaciones de los demás quedan como estaban hasta que alguien los edite).

### 3.4 Aprobar, rechazar y anular

- **Aprobar** y **rechazar**: solo desde `OBSERVED`, con `compras:facturas:approve`. Aprobar exige comentario; rechazar, motivo.
- **Anular:** con `compras:facturas:update` y motivo. Un comprobante con NC o ND vinculadas vigentes no se anula: "Tiene la Nota de crédito A 00003-00000045 vinculada: anulala primero".
- La etapa 5 sumará "no se anula si tiene pagos".

### 3.5 Constatar en ARCA

- Servicio **WSCDC** (`ComprobanteConstatar`), con el ticket de WSAA del servicio `wscdc` y el certificado de la empresa. La sesión de ARCA se generaliza para pedir un ticket por servicio (`arca_tokens` ya tiene la columna `service`).
- Envía: modo CAE, CUIT del emisor, punto de venta, tipo, número, fecha, total, CAE, y el CUIT de la empresa como receptor. Exige que el comprobante tenga CAE.
- Resultado:
  - `A` → `arca_check_result = APPROVED`;
  - `R` → `REJECTED`, el detalle con las observaciones de ARCA, y el comprobante pasa a `OBSERVED` con la observación `ARCA` (si estaba aprobado, vuelve a observado);
  - sin respuesta o error de transporte → `UNAVAILABLE`, aviso y nada cambia de estado.
- Si el certificado no está habilitado para WSCDC, ARCA rechaza el ticket: el mensaje explica que hay que asociar el servicio "Constatación de comprobantes" al certificado en ARCA.
- **Modo simulado** (`ARCA_MODE=mock`): aprueba, salvo `ARCA_MOCK_SCENARIO=reject` (rechaza) o `timeout` (sin respuesta).
- Permiso: `compras:facturas:update`.

### 3.6 Libro IVA Compras

- Por período (`vat_period`), todos los comprobantes vigentes (incluidos los observados y rechazados), ordenados por fecha de emisión y comprobante.
- Las NC restan: en pantalla y Excel con signo negativo.
- Columnas: fecha, comprobante, proveedor, CUIT, neto gravado, no gravado, exento, IVA por alícuota (una columna por alícuota usada en el período), percepciones de IVA, percepciones de IIBB, otros tributos (internos + otros) y total.
- Totales del período por alícuota y por columna.
- **Excel** con el formato de la pantalla.
- **TXT del Libro IVA Digital** (RG 4597):
  - `LIBRO_IVA_DIGITAL_COMPRAS_CBTE`, 325 caracteres por registro;
  - `LIBRO_IVA_DIGITAL_COMPRAS_ALICUOTAS`, 84 caracteres por registro: uno por alícuota de cada comprobante A o B. Los C no llevan registro de alícuotas y su cantidad de alícuotas es 0;
  - importes en positivo, sin separador decimal y con 2 decimales implícitos, rellenos con ceros; textos rellenos con espacios a la derecha; moneda `PES`, tipo de cambio `0001000000`;
  - código de documento del vendedor 80 (CUIT).
- Permiso: `compras:libro-iva:view`.

### 3.7 Permisos

- Tab nueva `compras:facturas`: `view`, `create` (cargar), `update` (editar, anular y constatar), `approve` (aprobar y rechazar observados).
- Tab nueva `compras:libro-iva`: `view`.
- Conceptos de gasto: `compras:config-compras:update`.
- **Perímetro:** proveedor, OC, líneas de OC, comprobante vinculado, concepto y provincia se validan contra la empresa activa.

## 4. Pantallas

- **Menú de Compras:** Solicitudes, Cotizaciones, Órdenes de compra, Recepciones, **Facturas**, **Libro IVA**, Proveedores y Configuración.
- **Facturas** (tabla del agente `table-expert`): comprobante, fecha, proveedor, CUIT, período, total, vencimiento, estado, constatación, OC vinculadas y cargó. Botón **Cargar comprobante** (`facturas:create`).
- **Cargar / editar comprobante** (`/dashboard/purchases/invoices/new` y `/[id]/edit`), un solo formulario:
  - **Datos:** proveedor (muestra su condición de IVA y la letra esperada), tipo, punto de venta y número, fecha de emisión y vencimiento (escritura directa), período IVA, CAE y su vencimiento, comprobante vinculado (para NC y ND) y PDF;
  - **Líneas:**
    - **Agregar desde OC:** elige una OC del proveedor y trae sus líneas con algo recibido y no facturado, con el precio y la alícuota de la OC. Se puede cambiar cantidad, precio y alícuota (si difieren, la fila lo marca antes de guardar);
    - **Agregar gasto:** concepto, descripción, neto y alícuota;
  - **IVA por alícuota:** precargado, con el importe editable;
  - **Tributos:** filas de percepción de IVA, percepción de IIBB (provincia), impuestos internos y otros (descripción);
  - **No gravado y exento:** dos importes;
  - total en vivo y un solo **Guardar**;
  - el toast dice el resultado con números: "Factura A 00003-00012345 cargada: conforme" u "observada: 2 diferencias (precio, cantidad)".
- **Detalle del comprobante:** datos, líneas con la OC y las diferencias resaltadas en la fila, IVA y tributos, total, observaciones, constatación (resultado, fecha y detalle), comprobantes vinculados, adjunto, historial y botones **Editar**, **Constatar en ARCA**, **Aprobar**, **Rechazar** y **Anular**.
- **Detalle de la OC:** por línea, **Facturado** (neto de NC), y la sección **Comprobantes** con tipo, número, fecha, total y estado.
- **Libro IVA:** selector de período (mes), la tabla con totales, **Exportar Excel** y **Descargar TXT** (los dos archivos en un ZIP).
- **Configuración de Compras:** sección **Conceptos de gasto** (alta, renombrar, activar / desactivar), junto a los rubros de proveedor.
- **Teléfono:** formulario y detalle sin scroll horizontal de página; la tabla del Libro IVA scrollea dentro de su tarjeta.

## 5. Tests

- **Unitarios:** letra esperada (todas las combinaciones de la §3.2), cuenta de totales e IVA por alícuota, tolerancia de $1, facturado neto con NC, registros del TXT (largo exacto, relleno, importes, C sin alícuotas, NC en positivo).
- **Integración** (`npm run test:purchases`):
  - comprobante conforme contra OC recibida;
  - cada observación: letra, IVA, precio, alícuota y cantidad;
  - errores: proveedor distinto de la OC, OC no aprobada, duplicado, NC que deja lo facturado negativo;
  - aprobar y rechazar (solo observados, con permiso);
  - una NC libera cantidad: la factura siguiente ya no se observa;
  - anular libera; no se anula con NC vinculada; un duplicado de un anulado se puede cargar;
  - un rechazado no cuenta como facturado;
  - dos comprobantes simultáneos de la misma línea: el segundo queda observado por cantidad;
  - comprobante solo de gastos y uno mixto;
  - constatación en modo simulado: aprobada, rechazada (pasa a observado) y sin respuesta (no cambia);
  - Libro IVA: totales del período, NC restando, TXT con la cantidad de registros esperada;
  - perímetro (proveedor, OC, comprobante vinculado y concepto de otra empresa) y permisos.
- **WSCDC:** test del armado del XML y del parseo de la respuesta (aprobada, rechazada con observaciones, error de ticket), sin red.
- **pgTAP:** CHECK nuevos y el único del comprobante.
- **Navegador:** cargar contra OC con diferencias, aprobar, NC, gasto sin OC, constatar (simulado), Libro IVA con Excel y TXT, y el ancho de teléfono.
- **Build:** `npx next build`.

## 6. Manual de uso

- Guías nuevas **Facturas de proveedor** y **Libro IVA Compras**.
- Actualizar:
  - **Órdenes de compra:** columna Facturado y sección Comprobantes;
  - **Cómo funciona Compras:** secciones, permisos y "lo que viene" (etapa 5);
  - **Configuración de Compras:** conceptos de gasto.
- `npm run manual:check` sin problemas.

## 7. Demo

- Facturas conformes de las OC recibidas.
- Una observada por precio y otra aprobada con comentario.
- Una NC vinculada a una factura.
- Gastos sin OC (servicio de luz, honorarios) con sus conceptos.
- Un período completo con percepciones, para que el Libro IVA muestre todas las columnas.

## 8. Fuera de alcance de la etapa 4

- Pagos, cuenta corriente y retenciones (etapa 5).
- Aceptación o rechazo de Facturas de Crédito Electrónicas MiPyME (FCE).
- Comprobantes M, tickets fiscales y despachos de importación.
- Moneda extranjera.
- Cierre de períodos de IVA.
- Asientos contables.
- Carga automática desde el PDF o desde "Mis comprobantes" de ARCA.
