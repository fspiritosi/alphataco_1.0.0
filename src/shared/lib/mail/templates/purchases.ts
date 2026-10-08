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
