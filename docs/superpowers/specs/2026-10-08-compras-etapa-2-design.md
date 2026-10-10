# Compras — Etapa 2: pedidos de cotización y órdenes de compra

**Fecha:** 2026-10-08
**Estado:** diseño aprobado en conversación (2026-10-08), pendiente de revisión de la spec escrita
**Parte de:** `2026-10-08-compras-etapa-1-design.md` (§1, mapa de las 5 etapas).

Rigen las convenciones de la etapa 1:
- multiempresa con la empresa resuelta en el servidor;
- `ActionResult` en las mutaciones;
- schemas Zod sin directiva;
- permisos por tab solo para los 3 roles de sistema;
- M:M con altas y bajas explícitas;
- manual de uso en la misma etapa;
- `next build` antes del PR.

## 1. Objetivo y decisiones

Que una solicitud de compra aprobada se convierta en una **orden de compra** (OC) emitida, aprobada y enviada al proveedor, con la posibilidad de pedir precio antes a uno o varios proveedores y comparar.

| Tema | Decisión |
| ---- | -------- |
| Arquitectura | **Pedido de cotización** y **orden de compra** como entidades separadas. Las cotizaciones quedan como respaldo de por qué se le compró a un proveedor, aunque no ganen. |
| Cotización | **Opcional.** Se puede cotizar a varios y comparar, o emitir la OC directo desde la solicitud aprobada. |
| Precios del proveedor | **Los carga el comprador.** El sistema manda el pedido de cotización por mail con PDF; el proveedor responde por fuera y el comprador carga precios, plazo, validez y el presupuesto adjunto. No hay portal para proveedores. |
| Aprobación de la OC | **Sí, por permiso** (`compras:ordenes:approve`). Recién aprobada se envía. |
| OC ↔ solicitudes | **N↔N por línea.** Una OC puede juntar líneas de varias solicitudes (del mismo proveedor) y una solicitud puede repartirse en varias OC. Toda línea de OC cubre una línea de solicitud aprobada. |
| Precios | **Neto + alícuota de IVA, en pesos.** Alícuotas del catálogo `VAT_RATES` de ARCA (`src/shared/lib/arca/catalogs.ts`), el mismo de Facturación. La de 0% cubre exento y no gravado. |
| Documentos vencidos del proveedor | **Avisan, no bloquean**, al armar, aprobar y enviar la OC. |

## 2. Modelo de datos

### 2.1 Pedido de cotización

- **`purchase_quotes`**
  - `company_id`, `number` (`PC-000001`, único por empresa), `supplier_id`, `status` y `created_by`;
  - envío: `sent_at?` y `sent_to?` (`text[]`, los mails a los que salió; vacío si se marcó como enviado a mano);
  - respuesta del proveedor:
    - `received_at?`, `valid_until?` (fecha) y `delivery_days?` (plazo en días);
    - `supplier_notes?`;
    - `attachment_path?` y `attachment_name?`: el presupuesto, en el bucket `supplier-documents` (`<companyId>/<supplierId>/quotes/<archivo>`);
  - `notes?` (internas);
  - anulación: `cancelled_by?`, `cancelled_at?` y `cancel_reason?`;
  - `created_at` y `updated_at`.
- **`purchase_quote_lines`**
  - `quote_id`, `request_line_id` (FK a `purchase_request_lines`) y `quantity`;
  - lo que cotizó el proveedor, nulo hasta la respuesta: `unit_price?` (neto, `Decimal(15,4)`) y `vat_rate_id?` (`Int`, id de `VAT_RATES`);
  - `not_quoted` (bool, default false: "no cotiza este ítem");
  - única: `(quote_id, request_line_id)`.
- **Estados**
  - `DRAFT` → `SENT` → `RECEIVED` | `DECLINED`. Más `CANCELLED` desde `DRAFT` o `SENT`.
  - `RECEIVED`: se cargó la respuesta; toda línea tiene precio o `not_quoted`, y al menos una tiene precio.
  - `DECLINED`: el proveedor no cotiza nada.
  - Una cotización en `RECEIVED` se puede volver a editar (corregir un precio mal cargado) mientras no haya OC generada desde ella.

### 2.2 Orden de compra

- **`purchase_orders`**
  - `company_id`, `number` (`OC-000001`, único por empresa), `supplier_id`, `quote_id?` (la cotización de la que salió), `status` y `created_by`;
  - condiciones comerciales: `delivery_date?`, `delivery_place?` (texto: "Base Neuquén", "Obrador Añelo"…), `payment_term_days?` (precargado del proveedor, editable) y `notes?`;
  - totales `subtotal`, `vat_total` y `total` (`Decimal(15,2)`, calculados en el servidor);
  - `submitted_at?`;
  - aprobación: `approved_by?` y `approved_at?`;
  - rechazo: `rejection_notes?` (el último), `rejected_by?` y `rejected_at?`;
  - envío: `sent_at?`, `sent_to?` (`text[]`) y `sent_by?`;
  - anulación: `cancelled_by?`, `cancelled_at?` y `cancel_reason?`;
  - `created_at` y `updated_at`.
- **`purchase_order_lines`**
  - `order_id`, `request_line_id` (FK, **obligatoria**), `quote_line_id?` y `position`;
  - `quantity`, `unit_price` (neto) y `vat_rate_id`;
  - totales de la línea: `net_total` y `vat_amount`;
  - el material o la descripción y la unidad se leen de la línea de solicitud (no se duplican).
- **Estados**
  - `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `SENT`.
  - **Rechazar** devuelve a `DRAFT` con el motivo; el historial guarda cada rechazo.
  - **Anular** (`CANCELLED`, con motivo) desde cualquier estado menos `CANCELLED`. En la etapa 3 se restringe a OC sin recepciones.
  - Se edita solo en `DRAFT`.

### 2.3 Avance de la solicitud

- Nuevos estados de la solicitud, después de `APPROVED`:
  - `PARTIALLY_ORDERED`: alguna línea tiene algo en OC no anuladas, pero no todo;
  - `ORDERED`: todas las líneas están cubiertas;
  - `CLOSED`: se dio por terminada sin comprar lo que faltaba, con motivo (`closed_by`, `closed_at` y `close_reason`).
- **Pedido en OC** de una línea de solicitud = Σ `quantity` de sus líneas de OC no anuladas. **Falta** = pedido en la solicitud − pedido en OC.
- El estado se recalcula al crear, editar o anular una OC.
- **Cerrar:** desde `APPROVED` o `PARTIALLY_ORDERED`, con `compras:solicitudes:update`. Lo ya pedido en OC sigue su curso.

### 2.4 CHECK en la base

- Cantidades > 0; precios ≥ 0.
- Línea de cotización: `not_quoted` excluye `unit_price` y `vat_rate_id`, que van juntos.
- Aprobación, envío y anulación de la OC: cada grupo de columnas va completo o vacío.
- Cierre de la solicitud: completo o vacío.

## 3. Reglas del servidor

- **Numeración** `PC-` y `OC-`: advisory lock propio por empresa, como `SC-`.
- **No pedir de más.**
  - Al crear o editar una OC (y al generarla desde una cotización), se lockean con `FOR UPDATE` las solicitudes de todas las líneas involucradas, ordenadas por id. Después se recalcula lo que falta.
  - Si una línea pide más de lo que falta, se rechaza: "De la línea 2 de SC-000012 (Aceite 15W40) quedan 5 l".
  - Dos compradores a la vez sobre la misma línea quedan en orden, y el segundo recibe el mensaje.
  - Al editar un borrador, lo que ya tenía esa misma OC no cuenta como pedido.
- **Las líneas de solicitud tienen que ser de solicitudes `APPROVED` o `PARTIALLY_ORDERED`**, de la empresa activa. Una OC junta solo líneas para su proveedor; no hay restricción por proveedor sugerido.
- **Totales** en el servidor:
  - `net_total` = `quantity × unit_price`, redondeado a 2 decimales;
  - `vat_amount` = `net_total × alícuota`, redondeado a 2;
  - los totales de la OC son la suma de las líneas.
  - El cliente muestra una vista previa con la misma función pura (`lib/order-totals.ts`), pero lo que vale es lo del servidor.
- **Generar OC desde una cotización:**
  - solo desde una cotización `RECEIVED`;
  - se copian las líneas con precio (no las `not_quoted`), por la **cantidad que falta** de cada línea de solicitud (como mucho, la cotizada);
  - si a alguna línea ya no le falta nada, se omite;
  - si no queda ninguna, se rechaza.
- **Envío por mail** (cotización y OC):
  1. se valida el estado (OC `APPROVED`; cotización `DRAFT`) y se arma el PDF;
  2. se envía el mail con el PDF adjunto a los destinatarios elegidos (por defecto, el contacto principal; al menos uno, con mail válido);
  3. solo si `sendMail` confirma el envío, se marca como enviada (`SENT`, `sent_at`, `sent_to`).
  - Si el envío falla, el usuario ve el error y la OC o la cotización quedan como estaban.
  - **Marcar como enviada** registra el envío manual sin mail (`sent_to` vacío).
- **Mail con adjuntos:** `MailMessage` suma `attachments?: { filename: string; content: Uint8Array; contentType: string }[]`, que se pasan a nodemailer. Los mails existentes no cambian.
- **PDF** (`@react-pdf/renderer` en el servidor, como `render-invoice-pdf.server.ts`):
  - **pedido de cotización:** membrete de la empresa, proveedor, líneas sin precio y texto con lo que se pide cotizar;
  - **OC:** membrete, proveedor (CUIT, condición de IVA, dirección), número y fecha, líneas con precio, IVA y totales, condiciones (entrega, lugar, plazo de pago) y notas.
  - Antes de aprobada, la OC lleva la marca **"BORRADOR — NO VÁLIDA"**.
  - **Descargar PDF** está disponible en cualquier estado, con el permiso `view` de la tab.
- **Avisos de documentos vencidos:** la OC (detalle, armado y diálogos de aprobar y enviar) muestra los documentos vigentes del proveedor vencidos al día de hoy.
- **Mails de decisión:** al aprobar o rechazar una OC se avisa a quien la creó, después de la transacción, como en la etapa 1. Si falla, la decisión queda.
- **Perímetro:**
  - proveedor, líneas de solicitud, líneas de cotización y cotización se validan contra la empresa;
  - una cotización solo genera OC para su propio proveedor;
  - los destinatarios del mail son libres: se valida que sean mails, no que sean contactos.
- **Permisos:**
  - `compras:cotizaciones`: `view`, `create`, `update` (enviar, cargar respuesta, anular);
  - `compras:ordenes`: `view`, `create`, `update` (editar borrador, enviar a aprobación, enviar al proveedor, anular) y `approve`;
  - cerrar una solicitud: `compras:solicitudes:update`.

## 4. Pantallas

- **Menú de Compras:** Solicitudes, **Cotizaciones**, **Órdenes de compra**, Proveedores y Configuración.
- **Solicitudes**
  - columna y filtro **Avance**, con los estados nuevos;
  - en el detalle de una solicitud aprobada:
    - botones **Pedir cotización**, **Generar OC** y **Cerrar**;
    - sección **Cotizaciones** con el comparativo: una fila por línea y una columna por proveedor (precio unitario, total con IVA, plazo), con el menor precio por línea resaltado y **Generar OC** por proveedor;
    - sección **Órdenes de compra**: las OC que cubren la solicitud, con estado;
    - por línea, **pedido en OC** y **falta**.
- **Pedir cotización** (diálogo desde la solicitud)
  - se eligen las líneas (por defecto, las que tienen faltante) y uno o varios proveedores (preseleccionados los sugeridos);
  - crea un pedido por proveedor, en borrador.
- **Cotizaciones** (tab)
  - tabla: número, proveedor, estado, enviada, respondida, validez, total cotizado y solicitudes de origen;
  - **Nuevo pedido de cotización**: proveedor + líneas pendientes de cualquier solicitud aprobada.
- **Detalle del pedido de cotización**
  - líneas; **Enviar** (diálogo con destinatarios y vista previa del PDF), **Marcar como enviado**, **Descargar PDF**;
  - **Cargar respuesta**: por línea, precio neto + alícuota, o "no cotiza"; además plazo, validez, notas del proveedor y adjunto;
  - **No cotiza**, **Anular** y **Generar OC**.
- **Órdenes de compra** (tab)
  - tabla: número, proveedor, estado, fecha de entrega, total, creó, aprobó, enviada y solicitudes de origen;
  - **Nueva orden de compra**.
- **Formulario de OC** (alta y edición de borrador)
  - proveedor (con aviso de documentos vencidos);
  - líneas tomadas de las líneas pendientes de solicitudes aprobadas (selector con número de solicitud, material o descripción, faltante), con cantidad, precio neto y alícuota;
  - fecha y lugar de entrega, plazo de pago y notas;
  - totales en vivo; **Guardar borrador** y **Enviar a aprobación**.
- **Detalle de la OC**
  - cabecera, condiciones, líneas con su solicitud de origen, totales e historial (creada, enviada a aprobación, rechazada con motivo, aprobada, enviada a…, anulada);
  - botones según estado y permiso: **Editar**, **Enviar a aprobación**, **Aprobar**, **Rechazar**, **Enviar al proveedor**, **Marcar como enviada**, **Descargar PDF** y **Anular**.
- **DataTables:** las crea el agente `table-expert`.

## 5. Tests

- **Unitarios:** máquinas de estado (cotización, OC y estados nuevos de la solicitud), cálculo de totales e IVA (redondeos), numeración y la cuenta de lo que falta.
- **Integración** (`npm run test:purchases`, con `sendMail` simulado):
  - cotización: crear una por proveedor, enviar (mail OK y mail que falla), cargar respuesta, no cotiza, anular;
  - OC desde cotización (copia precios; solo el faltante; omite `not_quoted`) y OC directa;
  - aprobar; rechazar (vuelve a borrador con motivo); editar y reenviar; enviar al proveedor (mail OK y mail que falla, que no marca enviada); marcar como enviada; anular, que libera lo pedido;
  - **no pedir de más**: secuencial, al editar un borrador y con dos OC concurrentes sobre la misma línea;
  - avance de la solicitud (parcial, ordenada, vuelve atrás al anular) y cierre;
  - perímetro (proveedor, líneas y cotización de otra empresa) y permisos (sin `approve` no aprueba).
- **pgTAP:** CHECK y unicidades nuevas.
- **Navegador:**
  - cotizar a dos proveedores, cargar respuestas y comparar;
  - generar la OC desde la mejor, aprobarla y enviarla con el PDF adjunto (Mailpit);
  - descargar el PDF;
  - OC directa;
  - aviso de documentos vencidos;
  - cerrar una solicitud.
- **Build:** `npx next build` completo.

## 6. Manual de uso

- Guías nuevas **Pedidos de cotización** y **Órdenes de compra**, en la sección Compras.
- **Solicitudes de compra**: avance, cerrar, comparativo, generar OC.
- **Cómo funciona Compras**: secciones, conceptos, permisos y el aviso de lo que viene.
- Camino de lectura **Comprar**.
- `npm run manual:check` sin problemas.

## 7. Demo

- Una solicitud cotizada a 3 proveedores: uno respondió, uno sin respuesta y uno no cotiza.
- Una OC **enviada** que salió de la cotización más barata.
- Una OC directa **pendiente de aprobación**.
- Una OC **rechazada** que volvió a borrador.
- Una solicitud **ordenada en parte**.

## 8. Fuera de alcance de la etapa 2

- Recepción de lo comprado y entrada a stock (etapa 3); no existe el estado "recibida".
- Facturas del proveedor e IVA compras (etapa 4).
- Pagos, cuenta corriente y retenciones (etapa 5).
- Multimoneda.
- Portal para que el proveedor cargue sus precios.
- Aprobación de OC por monto o por niveles.
- Bloquear OC por documentos vencidos.
- Recordatorios automáticos a proveedores que no respondieron.
