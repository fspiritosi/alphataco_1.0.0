# Compras — Etapa 3: recepción de lo comprado

**Fecha:** 2026-10-09
**Estado:** diseño aprobado en conversación (2026-10-09)
**Parte de:** `2026-10-08-compras-etapa-1-design.md` (§1, mapa de las 5 etapas). Sigue a `2026-10-08-compras-etapa-2-design.md`.

Rigen las convenciones de las etapas 1 y 2:
- multiempresa con la empresa resuelta en el servidor;
- `ActionResult`; schemas Zod sin directiva;
- permisos por tab solo para los 3 roles de sistema;
- numeración con advisory lock;
- manual de uso en la misma etapa;
- `next build` antes del PR.

## 1. Objetivo y decisiones

Registrar contra una OC enviada lo que el proveedor entrega, en una o varias veces. Los materiales entran a Almacenes con el costo de la OC; los servicios se dan por recibidos.

| Tema | Decisión |
| ---- | -------- |
| Arquitectura | **Recepción como entidad propia de Compras** (`purchase_receipts`) que registra la entrada a través del motor de stock de Almacenes. Un solo registro para materiales y servicios, base del control de facturas de la etapa 4. |
| Quién recibe | **Compras, con permiso propio**: sección **Recepciones** (`compras:recepciones`). Se registra desde el detalle de la OC. Quien recibe en el pañol necesita ese permiso, no los de Almacenes. |
| Compras imputadas a un destino | **Entran al depósito y nada más.** La salida al destino la hace Almacenes después, como hoy. La recepción muestra a quién estaba imputada cada línea. |
| Entregas de más | **Se reciben, y el excedente se regulariza con una OC complementaria automática**: borrador al mismo proveedor y precio, ligado a la OC original, que sigue el circuito de aprobación. |
| Lo que el proveedor no va a entregar | **Cerrar la OC con motivo.** Lo no recibido deja de contar como pedido y vuelve a quedar pendiente en sus solicitudes. |

## 2. Modelo de datos

### 2.1 Recepción

- **`purchase_receipts`**
  - `company_id`, `number` (`RC-000001`, único por empresa), `order_id` y `supplier_id` (el de la OC);
  - `warehouse_id?`: obligatorio si alguna línea es de material;
  - `received_on` (fecha), `delivery_note?` (número de remito), `attachment_path?` y `attachment_name?` (el remito, en el bucket `supplier-documents`: `<companyId>/<supplierId>/receipts/<archivo>`), `notes?`;
  - `stock_movement_id?` (único): la entrada a Almacenes, nulo si solo hay servicios;
  - `created_by` y `created_at`;
  - anulación: `cancelled_by?`, `cancelled_at?`, `cancel_reason?` y `reversal_movement_id?`.
- **`purchase_receipt_lines`**
  - `receipt_id`, `order_line_id` (FK a `purchase_order_lines`) y `quantity` (> 0);
  - `unit_cost`: el neto unitario de la línea de OC;
  - `batch_number?` y `batch_expires_on?` (materiales por lote); `serial_numbers` (`text[]`, materiales serializados).
- Una recepción **vigente** es la que no está anulada.

### 2.2 Orden de compra

- Estados nuevos, después de `SENT`:
  - `PARTIALLY_RECEIVED`: alguna línea tiene algo recibido, pero no todo;
  - `RECEIVED`: todas las líneas recibidas completas;
  - `CLOSED`: cerrada con motivo sin recibir lo que faltaba (`closed_by`, `closed_at`, `close_reason`).
- `SENT`, `PARTIALLY_RECEIVED` y `RECEIVED` se recalculan solos al recibir y al anular una recepción.
- `complements_order_id?`: la OC original de la que una **OC complementaria** regulariza un excedente. La complementaria lleva también `complements_receipt_id` (la recepción que la originó).
- **Anular** una OC solo se puede si no tiene recepciones vigentes. Es lo que la etapa 2 dejó anunciado.
- **Cerrar:** desde `SENT` o `PARTIALLY_RECEIVED`, con `compras:ordenes:update`.

### 2.3 CHECK en la base

- Cantidades > 0; `unit_cost` ≥ 0.
- Anulación de la recepción: los cuatro campos completos o vacíos.
- Cierre de la OC: completo o vacío, y `status = 'CLOSED'` exige el cierre.
- `complements_order_id` y `complements_receipt_id` van juntos.

## 3. Reglas del servidor

- **Qué falta recibir** de una línea de OC: `quantity` menos la suma de las líneas de recepciones vigentes que la apuntan.
- **Recibir:**
  - Solo en OC `SENT` o `PARTIALLY_RECEIVED`.
  - La OC se lockea `FOR UPDATE` antes que nada. Después vienen los locks del motor de stock, en su orden (materiales, saldos, unidades), y al final la numeración `RC-`. Dos recepciones simultáneas de la misma OC quedan en fila, y la segunda ve lo que registró la primera.
  - Cada línea recibida tiene que ser de esa OC.
  - Las líneas de material generan **un** movimiento `ENTRY` por recepción, con `registerStockMovement`:
    - en el depósito elegido, con `reference` "RC-000003 · OC-000007";
    - costo unitario = neto de la OC;
    - lote y vencimiento, o números de serie, según el material (los valida el motor);
    - después, `linkTiresFromEntry`, para que las cubiertas aparezcan en Gomería.
  - Las líneas de servicio (texto libre) no tocan el stock.
  - Si el motor rechaza algo, no se guarda nada y el usuario ve el mensaje del motor.
  - El depósito tiene que ser de la empresa y estar activo. Si no hay líneas de material, no se pide.
- **Excedente:**
  - Si una línea recibe más de lo que falta, la recepción registra la cantidad completa. En la misma transacción se crea una **OC complementaria** `DRAFT`:
    - mismo proveedor, número `OC-` nuevo;
    - una línea por excedente: misma línea de solicitud, mismo precio y alícuota, cantidad = excedente;
    - `complements_order_id` y `complements_receipt_id`; nota automática "Regulariza el excedente recibido en RC-000003".
  - Las líneas de recepción del excedente apuntan a la línea de la OC complementaria, así cada OC sabe qué recibió.
  - Las líneas de una OC complementaria **no pasan** por el control de "no pedir de más" de la etapa 2.
  - Al **aprobarse**, la complementaria queda `RECEIVED` directamente. No se envía al proveedor porque lo recibido ya llegó.
  - Si la complementaria se **rechaza**, vuelve a borrador como cualquier OC. Si se **anula**, el excedente sigue en el stock y la recepción queda marcada **"excedente sin OC"**. Se resuelve a mano, por ejemplo con una devolución o un ajuste en Almacenes.
- **Avance de la solicitud** (cambia la cuenta de la etapa 2): "pedido en OC" de una línea de solicitud =
  - lo pedido en las líneas de OC no anuladas ni cerradas,
  - más lo **recibido** en las OC cerradas.
  - Así, cerrar una OC devuelve lo no recibido a "falta".
  - Se recalcula al recibir, al anular una recepción, al cerrar una OC y al anular una complementaria.
- **Anular una recepción:**
  - Con `compras:recepciones:update` y motivo.
  - Llama a `reverseStockMovement` sobre su entrada. Si el stock ya salió, falla con el mensaje del motor.
  - Las recepciones con cubiertas no se anulan: igual que en Almacenes, se corrigen desde Gomería.
  - Si la recepción generó una OC complementaria, la anula con el mismo motivo, en cualquier estado (también aprobada): existe solo por esa recepción y su stock sale con la anulación. Las complementarias se lockean después de la OC y antes que las solicitudes.
  - Una complementaria en borrador (por ejemplo, rechazada) solo admite corregir precio, alícuota, notas y condiciones: proveedor, líneas y cantidades son las que llegaron.
  - Recalcula el estado de la OC y el de las solicitudes.
- **Almacenes:** el movimiento de una recepción no se anula desde Movimientos. `reverseStockMovementAction` responde "Se anula desde la recepción RC-000003".
- **Permisos:**
  - `compras:recepciones`: `view`, `create` (registrar), `update` (anular);
  - cerrar una OC: `compras:ordenes:update`;
  - la lista de depósitos activos para la recepción la ve quien tenga `recepciones:create`.
- **Perímetro:** OC, depósito y líneas se validan contra la empresa activa.

## 4. Pantallas

- **Menú de Compras:** Solicitudes, Cotizaciones, Órdenes de compra, **Recepciones**, Proveedores y Configuración.
- **Detalle de la OC**
  - botones **Registrar recepción** (en `SENT` o `PARTIALLY_RECEIVED`, con `recepciones:create`) y **Cerrar** (con motivo);
  - por línea, **Recibido** y **Falta recibir**;
  - sección **Recepciones**: número, fecha, remito y estado, con enlace;
  - enlaces entre la OC original y su complementaria;
  - historial: recepciones y cierre.
- **Registrar recepción** (`/dashboard/purchases/receipts/new?order=<id>`)
  - **Cabecera:** depósito (solo si hay materiales), fecha de recepción (escritura directa), número de remito, remito adjunto (opcional) y notas.
  - **Líneas:** una fila por línea de OC con algo por recibir. Muestra ítem, unidad, falta recibir y a quién estaba imputada la solicitud.
    - La cantidad recibida viene en lo que falta; 0 o vacío = no llegó.
    - Lote y vencimiento, o números de serie (uno por línea), según el material.
  - Si una cantidad supera lo que falta, aviso en la fila: "Se reciben 2 de más: se va a crear una OC complementaria en borrador por el excedente".
  - Un solo botón **Registrar recepción**.
  - El toast informa con números: "RC-000003: 3 líneas, entrada MOV-000045 en Base Neuquén", más "OC complementaria OC-000012 en borrador" si hubo excedente.
- **Detalle de la recepción:** OC, proveedor, depósito, remito (con el adjunto), líneas con lote o series, movimiento de stock (enlace a Almacenes), OC complementaria, marca "excedente sin OC", historial y **Anular** (motivo).
- **Tabla de recepciones** (la crea el agente `table-expert`): número, fecha, OC, proveedor, depósito, remito, estado (vigente / anulada), solicitudes de origen y creó.
- **Tabla de OC:** suma los estados nuevos con sus íconos.
- **Teléfono:** el formulario de recepción y los detalles sin scroll horizontal de página.

## 5. Tests

- **Unitarios:** máquina de estados de la OC (recibir, cerrar, anular con recepciones), cuenta de recibido / falta / excedente, y avance de la solicitud con OC cerradas.
- **Integración** (`npm run test:purchases`):
  - recepción parcial y total, con material y con servicio;
  - material por lote y serializado; la cubierta aparece en Gomería;
  - excedente: crea la complementaria; aprobarla la deja `RECEIVED`; anularla marca "excedente sin OC";
  - dos recepciones simultáneas de la misma OC que juntas superan lo que falta: la segunda genera excedente y nunca hay doble conteo;
  - anular una recepción: vuelve el estado; falla si el stock ya salió; arrastra la complementaria aunque esté aprobada; no se anula la de cubiertas;
  - complementaria rechazada: se corrige el precio y se reenvía; cambiar cantidades se rechaza;
  - el movimiento de una recepción no se anula desde Almacenes;
  - cerrar una OC devuelve el faltante a la solicitud; no se anula una OC con recepciones;
  - perímetro (OC, depósito y línea de otra empresa) y permisos.
- **pgTAP:** CHECK nuevos.
- **Navegador:** el circuito completo con lote y serie, excedente, anulación, cierre y el ancho de teléfono.
- **Build:** `npx next build`.

## 6. Manual de uso

- Guía nueva **Recepciones**.
- Actualizar:
  - **Órdenes de compra:** estados nuevos, cerrar, complementaria, anular solo sin recepciones;
  - **Solicitudes de compra:** qué cuenta como pedido con OC cerradas;
  - **Cómo funciona Compras:** sección, permisos y "lo que viene";
  - **Movimientos de stock** (Almacenes): los ingresos que vienen de Compras y dónde se anulan.
- `npm run manual:check` sin problemas.

## 7. Demo

- Una OC recibida en parte, con un material por lote.
- Una OC recibida completa con excedente, y su OC complementaria pendiente de aprobación.
- Una OC cerrada con faltante (la solicitud vuelve a tener pendiente).
- Una recepción de un servicio.

## 8. Fuera de alcance de la etapa 3

- Facturas del proveedor (etapa 4) y pagos (etapa 5).
- Avisos por mail de la recepción.
- Devolución de mercadería al proveedor (se hace con una salida o un ajuste de Almacenes).
- Control de calidad y rechazos parciales en la recepción.
- Recibir sin OC.
- Salida automática al destino de la imputación.
