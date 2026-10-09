import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import moment from 'moment';

export interface HistoryEntry {
  event: string;
  /** ISO con hora, o `YYYY-MM-DD` para los eventos que solo tienen fecha (la respuesta del proveedor). */
  at: string | null;
  by: string | null;
  notes?: string | null;
}

/** Historial de un documento de Compras (solicitud, cotizacion, OC): evento, quien, cuando y motivo. */
export function HistoryCard({ history }: { history: readonly HistoryEntry[] }) {
  const at = (iso: string | null) => {
    if (!iso) return '—';
    // Una fecha sin hora no se pasa por la zona horaria: "2026-10-08" es el 08/10, no el 07/10 21:00.
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? moment(iso, 'YYYY-MM-DD').format('DD/MM/YYYY') : moment(iso).format('DD/MM/YYYY HH:mm');
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {history.map((h, i) => (
            <li key={`${h.event}-${h.at}-${i}`} className="text-sm">
              <span className="font-medium">{h.event}</span>
              <span className="text-muted-foreground">
                {h.by ? ` · ${h.by}` : ''} · {at(h.at)}
              </span>
              {h.notes && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{h.notes}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
