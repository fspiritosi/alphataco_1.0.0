import { XMLParser } from 'fast-xml-parser';
import { ArcaProtocolError, type ArcaMessage } from './errors.ts';

/**
 * Armado y parseo de SOAP para ARCA. Los valores se parsean SIEMPRE como string
 * (`parseTagValue: false`): un CAE de 14 dígitos o un importe convertidos a `number` pierden
 * ceros o precisión.
 */

/** Tags que ARCA devuelve como lista aunque traigan un solo elemento. */
const ARRAY_TAGS = new Set([
  'Err',
  'Obs',
  'Evt',
  'AlicIva',
  'CbteAsoc',
  'Tributo',
  'FECAEDetResponse',
  'PtoVenta',
  'CbteTipo',
  'IvaTipo',
  'Moneda',
  'CondicionIvaReceptor',
]);

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ARRAY_TAGS.has(name),
});

export type XmlNode = { [key: string]: XmlValue };
export type XmlValue = string | XmlNode | XmlValue[] | undefined;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** `<tag>valor</tag>` con el valor escapado; `undefined`/`null` no genera nada. */
export function el(tag: string, value: string | number | null | undefined): string {
  if (value === undefined || value === null) return '';
  return `<${tag}>${escapeXml(String(value))}</${tag}>`;
}

export function parseXml(xml: string): XmlNode {
  try {
    const parsed: unknown = parser.parse(xml);
    if (!isNode(parsed)) throw new Error('raíz vacía');
    return parsed;
  } catch (error) {
    throw new ArcaProtocolError(
      `XML inválido de ARCA: ${error instanceof Error ? error.message : String(error)}`,
      null
    );
  }
}

export function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Navega por una ruta de tags; devuelve `undefined` si algún tramo falta. */
export function pick(node: XmlValue, ...path: string[]): XmlValue {
  let current: XmlValue = node;
  for (const key of path) {
    if (!isNode(current)) return undefined;
    current = current[key];
  }
  return current;
}

export function text(node: XmlValue, ...path: string[]): string | undefined {
  const value = pick(node, ...path);
  return typeof value === 'string' ? value : undefined;
}

export function list(node: XmlValue, ...path: string[]): XmlNode[] {
  const value = pick(node, ...path);
  if (Array.isArray(value)) return value.filter(isNode);
  return isNode(value) ? [value] : [];
}

/** Contenido de `Envelope/Body` de una respuesta SOAP. */
export function soapBody(xml: string): XmlNode {
  const body = pick(parseXml(xml), 'Envelope', 'Body');
  if (!isNode(body)) throw new ArcaProtocolError('Respuesta SOAP sin Body', null);
  return body;
}

/** `{ code, message }` de un SOAP Fault, si lo hay. */
export function soapFault(body: XmlNode): { code: string; message: string } | null {
  const fault = body.Fault;
  if (!isNode(fault)) return null;
  return {
    code: text(fault, 'faultcode') ?? 'unknown',
    message: text(fault, 'faultstring') ?? 'Fault sin mensaje',
  };
}

/** Lista de `{ Code, Msg }` (Errors/Err, Observaciones/Obs, Events/Evt) normalizada. */
export function messages(node: XmlValue, container: string, item: string): ArcaMessage[] {
  return list(node, container, item).map((m) => ({
    code: Number(text(m, 'Code') ?? '0'),
    message: text(m, 'Msg') ?? '',
  }));
}
