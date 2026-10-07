/**
 * Tacha los secretos de un XML de ARCA antes de guardarlo o mostrarlo: token y sign de WSFE, el
 * CMS firmado de WSAA y las credenciales del ticket (que llegan como XML escapado dentro de
 * `loginCmsReturn`).
 */
const PLAIN_SECRET_TAGS = /<((?:\w+:)?(?:Token|Sign|in0))>[^<]*<\/\1>/g;
const ESCAPED_SECRET_TAGS = /&lt;(token|sign)&gt;[\s\S]*?&lt;\/\1&gt;/g;

export function redactArcaXml(xml: string): string {
  return xml.replace(PLAIN_SECRET_TAGS, '<$1>***</$1>').replace(ESCAPED_SECRET_TAGS, '&lt;$1&gt;***&lt;/$1&gt;');
}
