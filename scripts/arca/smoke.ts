/**
 * Prueba de punta a punta de la integración con ARCA, sin base ni UI.
 *
 * Los archivos (clave privada, CSR, certificado y ticket de acceso) viven FUERA del repo, en
 * `~/.alphataco-arca/<ambiente>/` (o `--dir`). La clave privada es un secreto: no copiarla al repo.
 *
 * Uso:
 *   node scripts/arca/smoke.ts dummy                                   Estado de los servidores (sin certificado)
 *   node scripts/arca/smoke.ts csr --cuit 20111111112 --org "Mi Empresa SRL" --alias alphataco
 *                                                                      Genera key.pem + request.csr (subir el CSR a ARCA)
 *   node scripts/arca/smoke.ts check --cuit 20111111112                Valida cert.crt contra key.pem
 *   node scripts/arca/smoke.ts diagnose --cuit 20111111112             Login WSAA, puntos de venta, catálogos y últimos números
 *   node scripts/arca/smoke.ts cae --cuit 20111111112 --pto 1 --tipo 6 --neto 100 [--alicuota 5]
 *                                  [--doc 20222222223 --cond 1]        Emite un comprobante de prueba y muestra el CAE
 *   node scripts/arca/smoke.ts consult --cuit 20111111112 --pto 1 --tipo 6 --nro 1
 *
 * Opciones comunes: --env homologacion|produccion (default homologacion), --dir <carpeta>, --verbose.
 * Producción exige ARCA_ALLOW_PRODUCTION=true.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ARCA_CURRENCY_BY_ISO, CBTE_TYPES, RECEIVER_VAT_CONDITIONS, VAT_RATES, isCbteTypeId, isVatRateId } from '../../src/shared/lib/arca/catalogs.ts';
import { certificateMatchesKey, certificateProblems, inspectCertificate } from '../../src/shared/lib/arca/certificate.ts';
import { generateKeyAndCsr } from '../../src/shared/lib/arca/csr.ts';
import { argentinaDateOnly, toArcaDate } from '../../src/shared/lib/arca/dates.ts';
import { isProductionAllowed, type ArcaEnvironment } from '../../src/shared/lib/arca/endpoints.ts';
import { ArcaError } from '../../src/shared/lib/arca/errors.ts';
import type { SoapCallInfo } from '../../src/shared/lib/arca/http.ts';
import { redactArcaXml } from '../../src/shared/lib/arca/redact.ts';
import { requestAccessTicket, type AccessTicket } from '../../src/shared/lib/arca/wsaa.ts';
import {
  consultVoucher,
  feDummy,
  getLastAuthorized,
  getParamList,
  getReceiverVatConditions,
  getSalesPoints,
  isDummyOk,
  requestCae,
  type WsfeAuth,
  type WsfeContext,
} from '../../src/shared/lib/arca/wsfe.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    env: { type: 'string', default: 'homologacion' },
    dir: { type: 'string' },
    cuit: { type: 'string' },
    org: { type: 'string' },
    alias: { type: 'string', default: 'alphataco' },
    force: { type: 'boolean', default: false },
    pto: { type: 'string' },
    tipo: { type: 'string' },
    nro: { type: 'string' },
    neto: { type: 'string' },
    alicuota: { type: 'string', default: '5' },
    doc: { type: 'string' },
    cond: { type: 'string' },
    verbose: { type: 'boolean', default: false },
  },
});

const command = positionals[0];
const env = values.env as ArcaEnvironment;
if (env !== 'homologacion' && env !== 'produccion') fail('--env debe ser homologacion o produccion');
if (env === 'produccion' && !isProductionAllowed()) fail('Producción deshabilitada: falta ARCA_ALLOW_PRODUCTION=true');

const dir = values.dir ?? join(homedir(), '.alphataco-arca', env);
const paths = {
  key: join(dir, 'key.pem'),
  csr: join(dir, 'request.csr'),
  cert: join(dir, 'cert.crt'),
  ticket: (cuit: string) => join(dir, `ta-${cuit}-wsfe.json`),
};

const ctx: WsfeContext = {
  env,
  onCall: values.verbose ? (info: SoapCallInfo) => logCall(info) : undefined,
};

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function logCall(info: SoapCallInfo) {
  const redact = (xml: string | null) => redactArcaXml(xml ?? '').slice(0, 4000);
  console.log(`\n── ${info.soapAction || 'loginCms'} · HTTP ${info.status ?? '-'} · ${info.durationMs} ms`);
  console.log(`>>> ${redact(info.requestXml)}`);
  console.log(`<<< ${redact(info.responseXml)}`);
  if (info.error) console.log(`!!! ${info.error}`);
}

function requireCuit(): string {
  const cuit = values.cuit?.replace(/\D/g, '');
  if (!cuit || cuit.length !== 11) fail('Falta --cuit (11 dígitos) del emisor');
  return cuit;
}

function readCredentials(): { certificatePem: string; privateKeyPem: string } {
  if (!existsSync(paths.key)) fail(`No existe ${paths.key}. Generalo con el comando csr.`);
  if (!existsSync(paths.cert)) fail(`No existe ${paths.cert}. Guardá ahí el certificado que devolvió ARCA.`);
  return { certificatePem: readFileSync(paths.cert, 'utf8'), privateKeyPem: readFileSync(paths.key, 'utf8') };
}

/** Ticket de WSAA cacheado en disco: ARCA no entrega otro mientras el anterior siga vigente. */
async function getAuth(cuit: string): Promise<WsfeAuth> {
  const file = paths.ticket(cuit);
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, 'utf8')) as { token: string; sign: string; expiresAt: string };
    if (new Date(cached.expiresAt).getTime() - Date.now() > 10 * 60 * 1000) {
      console.log(`• Ticket de acceso reutilizado (vence ${cached.expiresAt})`);
      return { token: cached.token, sign: cached.sign, cuit };
    }
  }
  const { certificatePem, privateKeyPem } = readCredentials();
  const ticket: AccessTicket = await requestAccessTicket({
    env,
    service: 'wsfe',
    certificatePem,
    privateKeyPem,
    now: new Date(),
    onCall: ctx.onCall,
  });
  writeFileSync(file, JSON.stringify({ ...ticket }, null, 2), { mode: 0o600 });
  console.log(`✔ Login WSAA OK (vence ${ticket.expiresAt.toISOString()})`);
  return { token: ticket.token, sign: ticket.sign, cuit };
}

/** Importe decimal positivo ("100", "100.5") → centavos enteros (alcanza para montos de prueba). */
function toCents(value: string): number {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value)) fail(`Importe inválido: ${value}`);
  const [int, dec = ''] = value.split('.');
  return Number(int) * 100 + Number(dec.padEnd(2, '0'));
}

function formatCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

async function main() {
  switch (command) {
    case 'dummy': {
      const status = await feDummy(ctx);
      console.log(status);
      if (!isDummyOk(status)) process.exitCode = 1;
      return;
    }

    case 'csr': {
      const cuit = requireCuit();
      if (!values.org) fail('Falta --org con la razón social');
      if (existsSync(paths.key) && !values.force) {
        fail(`Ya existe ${paths.key}. Usá --force para regenerarla (invalida el certificado anterior).`);
      }
      mkdirSync(dir, { recursive: true });
      const { privateKeyPem, csrPem } = generateKeyAndCsr({ cuit, organization: values.org, alias: values.alias! });
      writeFileSync(paths.key, privateKeyPem, { mode: 0o600 });
      writeFileSync(paths.csr, csrPem);
      console.log(`✔ Clave privada: ${paths.key} (secreta)`);
      console.log(`✔ CSR: ${paths.csr}`);
      console.log('\nPróximo paso: subí el CSR en ARCA (WSASS para homologación, "Administración de');
      console.log('Certificados Digitales" para producción), asociá el certificado al servicio wsfe y');
      console.log(`guardá el .crt que devuelve como ${paths.cert}`);
      return;
    }

    case 'check': {
      const cuit = requireCuit();
      const { certificatePem, privateKeyPem } = readCredentials();
      const info = inspectCertificate(certificatePem);
      console.log(info);
      console.log(`Clave coincide con el certificado: ${certificateMatchesKey(certificatePem, privateKeyPem) ? 'sí' : 'NO'}`);
      const problems = certificateProblems(info, { cuit, now: new Date() });
      problems.forEach((p) => console.log(`✖ ${p}`));
      if (problems.length === 0) console.log('✔ Certificado utilizable');
      return;
    }

    case 'diagnose': {
      const cuit = requireCuit();
      console.log('FEDummy:', await feDummy(ctx));
      const auth = await getAuth(cuit);

      const salesPoints = await getSalesPoints(ctx, auth);
      console.log('\nPuntos de venta habilitados para web services:', salesPoints.length ? salesPoints : '(ninguno)');

      const cbteTypes = await getParamList(ctx, auth, 'FEParamGetTiposCbte', 'CbteTipo');
      const vatTypes = await getParamList(ctx, auth, 'FEParamGetTiposIva', 'IvaTipo');
      const currencies = await getParamList(ctx, auth, 'FEParamGetTiposMonedas', 'Moneda');

      console.log('\nComparación de catálogos (✔ coincide con src/shared/lib/arca/catalogs.ts):');
      for (const [id, info] of Object.entries(CBTE_TYPES)) {
        const remote = cbteTypes.find((t) => Number(t.id) === Number(id));
        console.log(`  ${remote ? '✔' : '✖'} Comprobante ${id} ${info.label} → ${remote?.description ?? 'NO EXISTE EN ARCA'}`);
      }
      for (const [id, rate] of Object.entries(VAT_RATES)) {
        const remote = vatTypes.find((t) => Number(t.id) === Number(id));
        console.log(`  ${remote ? '✔' : '✖'} IVA ${id} ${rate}% → ${remote?.description ?? 'NO EXISTE EN ARCA'}`);
      }
      for (const [iso, arcaId] of Object.entries(ARCA_CURRENCY_BY_ISO)) {
        const remote = currencies.find((c) => c.id === arcaId);
        console.log(`  ${remote ? '✔' : '✖'} Moneda ${iso} → ${arcaId} ${remote?.description ?? 'NO EXISTE EN ARCA'}`);
      }
      for (const letter of ['A', 'B', 'C'] as const) {
        const remote = await getReceiverVatConditions(ctx, auth, letter);
        const local = Object.entries(RECEIVER_VAT_CONDITIONS)
          .filter(([, c]) => (c.letters as readonly string[]).includes(letter))
          .map(([id]) => Number(id))
          .sort((a, b) => a - b);
        const remoteIds = remote.map((r) => Number(r.id)).sort((a, b) => a - b);
        const same = JSON.stringify(local) === JSON.stringify(remoteIds);
        console.log(`  ${same ? '✔' : '✖'} Condiciones IVA receptor clase ${letter}: ARCA ${JSON.stringify(remoteIds)} / local ${JSON.stringify(local)}`);
        if (!same) remote.forEach((r) => console.log(`      ${r.id} ${r.description}`));
      }

      const points = salesPoints.length ? salesPoints.map((p) => p.number) : [1];
      console.log('\nÚltimos comprobantes autorizados:');
      for (const pto of points) {
        for (const tipo of [1, 6, 11]) {
          try {
            console.log(`  PV ${pto} tipo ${tipo}: ${await getLastAuthorized(ctx, auth, pto, tipo)}`);
          } catch (error) {
            console.log(`  PV ${pto} tipo ${tipo}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      return;
    }

    case 'cae': {
      const cuit = requireCuit();
      const salesPoint = Number(values.pto);
      const cbteType = Number(values.tipo);
      if (!Number.isInteger(salesPoint) || salesPoint < 1) fail('Falta --pto (punto de venta)');
      if (!isCbteTypeId(cbteType) || !CBTE_TYPES[cbteType].enabled || CBTE_TYPES[cbteType].kind !== 'invoice') {
        fail('--tipo debe ser 1 (A), 6 (B) u 11 (C)');
      }
      if (!values.neto) fail('Falta --neto');
      const letter = CBTE_TYPES[cbteType].letter;

      const net = toCents(values.neto);
      const vatRateId = Number(values.alicuota);
      if (!isVatRateId(vatRateId)) fail('--alicuota inválida (3,4,5,6,8,9)');
      // Porcentaje en décimas (21 → 210) para redondear a centavos con enteros, mitad hacia arriba.
      const rateTenths = Math.round(Number(VAT_RATES[vatRateId]) * 10);
      const vat = letter === 'C' ? 0 : Math.floor((net * rateTenths + 500) / 1000);
      const total = net + vat;

      const receiverDoc = values.doc?.replace(/\D/g, '');
      const receiverCondition = Number(values.cond ?? (letter === 'A' ? 1 : 5));
      const auth = await getAuth(cuit);

      const last = await getLastAuthorized(ctx, auth, salesPoint, cbteType);
      const number = last + 1;
      const today = toArcaDate(argentinaDateOnly(new Date()));
      console.log(`• Último autorizado ${last}; se pide el ${number}`);

      const result = await requestCae(ctx, auth, {
        salesPoint,
        cbteType,
        detail: {
          concept: 2,
          docType: receiverDoc ? 80 : 99,
          docNumber: receiverDoc ?? '0',
          number,
          cbteDate: today,
          total: formatCents(total),
          untaxed: '0.00',
          net: formatCents(net),
          exempt: '0.00',
          otherTaxes: '0.00',
          vat: formatCents(vat),
          serviceFrom: today,
          serviceTo: today,
          paymentDue: today,
          currencyId: 'PES',
          exchangeRate: '1',
          receiverVatConditionId: receiverCondition,
          vatBreakdown: letter === 'C' ? [] : [{ id: vatRateId, base: formatCents(net), amount: formatCents(vat) }],
        },
      });

      console.log(`\nResultado: ${result.result}`);
      if (result.cae) console.log(`CAE: ${result.cae} (vence ${result.caeDueDate})`);
      result.observations.forEach((o) => console.log(`  Obs ${o.code}: ${o.message}`));
      result.errors.forEach((e) => console.log(`  Err ${e.code}: ${e.message}`));
      result.events.forEach((e) => console.log(`  Evt ${e.code}: ${e.message}`));
      if (result.result !== 'A') process.exitCode = 1;
      return;
    }

    case 'consult': {
      const cuit = requireCuit();
      const auth = await getAuth(cuit);
      const voucher = await consultVoucher(ctx, auth, Number(values.pto), Number(values.tipo), Number(values.nro));
      console.log(voucher ?? 'ARCA no tiene ese comprobante');
      return;
    }

    default:
      fail('Comando desconocido. Ver el encabezado de scripts/arca/smoke.ts');
  }
}

main().catch((error: unknown) => {
  if (error instanceof ArcaError) {
    console.error(`✖ ${error.name}: ${error.message} (resultado conocido: ${error.outcomeKnown ? 'sí' : 'NO'})`);
  } else {
    console.error('✖', error);
  }
  process.exit(1);
});
