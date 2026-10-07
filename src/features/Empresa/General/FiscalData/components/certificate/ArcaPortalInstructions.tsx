import { ExternalLink } from 'lucide-react';
import type { ARCA_ENVIRONMENTS } from '../../schemas/fiscal-data';

const ARCA_PORTAL_URL = 'https://auth.afip.gob.ar/contribuyente_/login.xhtml';

/** Paso 2 (externo): qué hacer en el portal de ARCA con la solicitud, según el ambiente. */
export function ArcaPortalInstructions({
  environment,
  alias,
}: {
  environment: (typeof ARCA_ENVIRONMENTS)[number];
  alias: string;
}) {
  const aliasCode = <code className="bg-muted px-1 font-mono text-xs">{alias}</code>;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {environment === 'homologacion' ? (
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-pretty">
          <li>
            Ingresá con tu clave fiscal y adherí el servicio &quot;WSASS – Autogestión Certificados Homologación&quot;.
          </li>
          <li>Creá un DN con el alias {aliasCode} y pegá la solicitud.</li>
          <li>Descargá el certificado que te devuelve.</li>
          <li>En WSASS, autorizá el alias para el servicio &quot;wsfe&quot;.</li>
        </ol>
      ) : (
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-pretty">
          <li>
            En &quot;Administración de Certificados Digitales&quot;, agregá el alias {aliasCode}, subí el archivo .csr y
            descargá el certificado.
          </li>
          <li>
            Después, en &quot;Administrador de Relaciones de Clave Fiscal&quot;, creá una nueva relación con el servicio
            &quot;Facturación electrónica&quot; (wsfe) y elegí como representante el alias del certificado.
          </li>
        </ol>
      )}

      <a
        href={ARCA_PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary inline-flex w-fit items-center gap-1.5 underline-offset-4 hover:underline"
      >
        Abrir el portal de ARCA (se abre en otra pestaña)
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
      <p className="text-muted-foreground">Cuando tengas el certificado (.crt) volvé acá y cargalo en el paso 3.</p>
    </div>
  );
}
