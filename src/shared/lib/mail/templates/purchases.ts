import 'server-only';

import { appUrl, renderActionEmail } from '../shell';
import { sendMail } from '../transport';

/**
 * Aviso al solicitante de que su solicitud de compra se aprobo o se rechazo (Compras etapa 1).
 * Quien lo llama lo hace DESPUES de confirmar la transaccion y no deja que un fallo de envio
 * cambie el resultado de la decision.
 */
export async function sendPurchaseRequestDecisionEmail(params: {
  to: string;
  name: string | null;
  number: string;
  approved: boolean;
  notes: string | null;
  requestId: string;
}): Promise<boolean> {
  const url = `${appUrl()}/dashboard/purchases/requests/${params.requestId}`;
  const verdict = params.approved ? 'aprobada' : 'rechazada';
  const greeting = params.name ? `Hola ${params.name}` : 'Hola';
  const reason = params.notes ? ` ${params.approved ? 'Comentario' : 'Motivo'}: ${params.notes}` : '';
  return sendMail({
    to: params.to,
    subject: `Solicitud de compra ${params.number} ${verdict}`,
    text: `${greeting}, tu solicitud de compra ${params.number} fue ${verdict}.${reason} Detalle: ${url}`,
    // `renderActionEmail` escapa titulo y cuerpo: van en texto plano.
    html: renderActionEmail(
      `Solicitud ${params.number} ${verdict}`,
      `${greeting}, tu solicitud de compra ${params.number} fue ${verdict}.${reason}`,
      { url, label: 'Ver la solicitud' }
    ),
  });
}

/**
 * Aviso a quien creo la orden de compra de que se aprobo o se rechazo (Compras etapa 2). Mismo
 * contrato que el de la solicitud: se llama despues de la transaccion y un fallo no cambia nada.
 */
export async function sendPurchaseOrderDecisionEmail(params: {
  to: string;
  name: string | null;
  number: string;
  approved: boolean;
  notes: string | null;
  orderId: string;
}): Promise<boolean> {
  const url = `${appUrl()}/dashboard/purchases/orders/${params.orderId}`;
  const verdict = params.approved ? 'aprobada' : 'rechazada';
  const greeting = params.name ? `Hola ${params.name}` : 'Hola';
  const reason = params.notes ? ` Motivo: ${params.notes}` : '';
  const next = params.approved ? ' Ya se puede enviar al proveedor.' : ' Volvió a borrador para corregirla.';
  return sendMail({
    to: params.to,
    subject: `Orden de compra ${params.number} ${verdict}`,
    text: `${greeting}, la orden de compra ${params.number} fue ${verdict}.${reason}${next} Detalle: ${url}`,
    html: renderActionEmail(
      `Orden de compra ${params.number} ${verdict}`,
      `${greeting}, la orden de compra ${params.number} fue ${verdict}.${reason}${next}`,
      { url, label: 'Ver la orden de compra' }
    ),
  });
}

/**
 * Mail al proveedor con el pedido de cotizacion o la orden de compra en PDF (Compras etapa 2).
 * A diferencia de los avisos internos, aca el envio ES la accion: quien lo llama solo marca el
 * documento como enviado si esto devuelve `true`.
 */
export async function sendSupplierDocumentEmail(params: {
  kind: 'quote' | 'order' | 'payment';
  to: readonly string[];
  number: string;
  companyName: string;
  supplierName: string;
  message: string | null;
  attachment: { filename: string; content: Uint8Array };
}): Promise<boolean> {
  const label = params.kind === 'quote' ? 'Pedido de cotización' : params.kind === 'order' ? 'Orden de compra' : 'Orden de pago';
  const intro =
    params.kind === 'quote'
      ? `${params.companyName} le solicita cotización por los ítems del pedido ${params.number}, que va adjunto en PDF.`
      : params.kind === 'order'
        ? `${params.companyName} le envía la orden de compra ${params.number}, adjunta en PDF.`
        : `${params.companyName} le informa el pago de la orden ${params.number}. Adjuntamos en PDF el detalle y los certificados de las retenciones practicadas.`;
  const body = [`Estimados ${params.supplierName}:`, '', intro, ...(params.message ? ['', params.message] : []), '', 'Saludos cordiales,', params.companyName].join(
    '\n'
  );
  return sendMail({
    to: params.to,
    subject: `${label} ${params.number} — ${params.companyName}`,
    text: body,
    attachments: [{ filename: params.attachment.filename, content: params.attachment.content, contentType: 'application/pdf' }],
  });
}
