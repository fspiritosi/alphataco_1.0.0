import { ExternalLink, Paperclip } from 'lucide-react';

interface Props {
  urls: string[];
}

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || url;
    return decodeURIComponent(last);
  } catch {
    return url;
  }
}

export function TicketAttachmentsList({ urls }: Props) {
  if (urls.length === 0) return null;
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Adjuntos ({urls.length})
      </h4>
      <ul className="space-y-1.5">
        {urls.map((url, i) => (
          <li key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className="truncate">{fileNameFromUrl(url)}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
