/**
 * Documentacion de empleados, equipos y empresa, con un PDF por documento cargado.
 *
 * Los documentos obligatorios de empleados y equipos NO se insertan: los generaron los
 * triggers al dar de alta cada recurso (estado `pendiente`). Aca se les asigna su estado final
 * con UN update por tabla (el recalculo de `status` del recurso es un trigger statement-level,
 * asi corre una sola vez). Ningun trigger vence documentos: `vencido` se setea explicitamente.
 *
 * Reparto de los que vencen: ~12% vencidos, ~13% por vencer (<30 dias), ~62% vigentes,
 * ~10% pendientes sin archivo y ~3% rechazados.
 */
import { addPdf, type Ctx } from '../lib/ctx.ts';
import { demoId } from '../lib/ids.ts';
import { toDmy } from '../lib/dates.ts';
import { DOCUMENT_BUCKET, companyFolder, pathSegment } from '../lib/paths.ts';
import { pick, weighted } from '../lib/random.ts';
import { DOC_TYPES, type DocTypeDef } from '../data/catalog.ts';
import type { DemoEmployee } from './employees.ts';
import type { DemoVehicle } from './vehicles.ts';

type Folder = 'persona' | 'equipos' | 'empresa';

function docPath(folder: Folder, owner: string | null, type: DocTypeDef, mark: string): string {
  const base = `${companyFolder()}/${folder}`;
  const file = `${pathSegment(type.name)}-(${mark}).pdf`;
  return owner ? `${base}/${owner}/${file}` : `${base}/${file}`;
}

type DocState = 'presentado' | 'vencido' | 'pendiente' | 'rechazado';

interface Outcome {
  state: DocState;
  /** Offset de vencimiento; null si el tipo no vence o el documento no tiene archivo. */
  expiry: number | null;
}

function outcomeFor(ctx: Ctx, type: DocTypeDef): Outcome {
  const { faker } = ctx;
  if (!type.expires) {
    return weighted(faker, [[{ state: 'presentado', expiry: null }, 92], [{ state: 'pendiente', expiry: null }, 8]]);
  }
  const bucket = weighted(faker, [['vencido', 12], ['por_vencer', 13], ['vigente', 62], ['pendiente', 10], ['rechazado', 3]] as const);
  switch (bucket) {
    case 'vencido':
      return { state: 'vencido', expiry: -faker.number.int({ min: 1, max: 120 }) };
    case 'por_vencer':
      return { state: 'presentado', expiry: faker.number.int({ min: 0, max: 29 }) };
    case 'vigente':
      return { state: 'presentado', expiry: faker.number.int({ min: 30, max: type.validityDays ?? 365 }) };
    case 'rechazado':
      return { state: 'rechazado', expiry: faker.number.int({ min: 30, max: 200 }) };
    default:
      return { state: 'pendiente', expiry: null };
  }
}

const DENY_REASONS = ['El documento está ilegible', 'Falta la firma del emisor', 'La fecha de vencimiento no coincide', 'Corresponde a otra persona/unidad'];

interface PendingUpdate {
  id: string;
  state: DocState;
  validity: Date | null;
  path: string | null;
  deny: string | null;
  policy: string | null;
  createdAt: Date;
}

/** Fila de documento mensual (no obligatorio): se inserta, no la genera ningun trigger. */
interface MonthlyDocRow {
  id: string;
  applies: string;
  id_document_types: string;
  period: string;
  state: 'presentado';
  document_path: string;
  user_id: string;
  created_at: Date;
}

async function applyUpdates(ctx: Ctx, table: 'documents_employees' | 'documents_equipment', updates: PendingUpdate[]): Promise<void> {
  if (!updates.length) return;
  const policyClause = table === 'documents_equipment' ? ', policy_number = v.policy' : '';
  await ctx.tx.$executeRawUnsafe(
    `UPDATE ${table} d
        SET state = v.state::state,
            validity = v.validity,
            document_path = v.path,
            deny_reason = v.deny,
            created_at = v.created_at,
            user_id = $7::uuid${policyClause}
       FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS state, unnest($3::timestamptz[]) AS validity,
                    unnest($4::text[]) AS path, unnest($5::text[]) AS deny, unnest($6::text[]) AS policy,
                    unnest($8::timestamptz[]) AS created_at) v
      WHERE d.id = v.id`,
    updates.map((u) => u.id),
    updates.map((u) => u.state),
    updates.map((u) => u.validity),
    updates.map((u) => u.path),
    updates.map((u) => u.deny),
    updates.map((u) => u.policy),
    ctx.actorId,
    updates.map((u) => u.createdAt)
  );
}

/** Fecha de emision coherente con el vencimiento, nunca en el futuro. */
function issuedOffset(ctx: Ctx, type: DocTypeDef, expiry: number | null): number {
  if (expiry !== null && type.validityDays) return Math.min(-1, expiry - type.validityDays);
  return -ctx.faker.number.int({ min: 30, max: 900 });
}

interface ResourceDoc {
  folder: Folder;
  /** Carpeta del recurso: `<nombre>-(<documento>)`. */
  owner: string;
  /** Primer dia en que el recurso pudo tener el documento (su ingreso). */
  since: number;
  /** Campos propios del recurso que encabezan el PDF. */
  fields: Array<[string, string]>;
  reference: string;
}

/**
 * Estado final de un documento obligatorio generado por trigger, con su PDF si tiene archivo.
 * Es el mismo recorrido para empleados y equipos: solo cambian el recurso y sus campos.
 */
async function resolvePending(ctx: Ctx, docId: string, type: DocTypeDef, resource: ResourceDoc): Promise<PendingUpdate> {
  const { cal, faker } = ctx;
  const outcome = outcomeFor(ctx, type);
  const issued = Math.max(issuedOffset(ctx, type, outcome.expiry), resource.since);
  const policy = type.policy && outcome.state !== 'pendiente' ? `POL-${faker.string.numeric(9)}` : null;
  let path: string | null = null;
  if (outcome.state !== 'pendiente') {
    const mark = outcome.expiry !== null ? toDmy(cal.ymd(outcome.expiry), '-') : 'v0';
    path = docPath(resource.folder, resource.owner, type, mark);
    await addPdf(ctx, DOCUMENT_BUCKET, path, {
      title: type.name,
      fields: [
        ...resource.fields,
        ['Fecha de emisión', toDmy(cal.ymd(issued))],
        ['Vencimiento', outcome.expiry === null ? 'Sin vencimiento' : toDmy(cal.ymd(outcome.expiry))],
        policy ? ['N° de póliza', policy] : ['N° de documento', `${type.key.toUpperCase().slice(0, 3)}-${faker.string.numeric(8)}`],
      ],
      body: `${type.description}. Se deja constancia de la presentación de la documentación requerida.`,
      reference: `${resource.reference}/${type.key}`,
    });
  }
  return {
    id: docId,
    state: outcome.state,
    validity: outcome.expiry === null ? null : cal.at(outcome.expiry, 23, 59),
    path,
    deny: outcome.state === 'rechazado' ? pick(faker, DENY_REASONS) : null,
    policy,
    createdAt: cal.at(issued, 11),
  };
}

function employeeResource(emp: DemoEmployee): ResourceDoc {
  return {
    folder: 'persona',
    owner: `${pathSegment(`${emp.firstname} ${emp.lastname}`)}-(${emp.dni})`,
    since: emp.admission,
    fields: [
      ['Titular', `${emp.lastname}, ${emp.firstname}`],
      ['CUIL', emp.cuil],
      ['Legajo', emp.file],
    ],
    reference: emp.file,
  };
}

function vehicleResource(veh: DemoVehicle): ResourceDoc {
  return {
    folder: 'equipos',
    owner: `${pathSegment(veh.domain)}-(${veh.domain})`,
    since: -3650,
    fields: [
      ['Dominio', veh.domain],
      ['Unidad', `${veh.typeName} ${veh.brand} ${veh.model}`],
      ['Año', String(veh.year)],
      ['N° interno', veh.internNumber],
    ],
    reference: veh.domain,
  };
}

/** Documentos mensuales de un recurso: una fila y un PDF por periodo. */
async function monthlyDocs(ctx: Ctx, applies: string, resource: ResourceDoc, type: DocTypeDef, monthsAgo: number[], body: string): Promise<MonthlyDocRow[]> {
  const { cal, faker } = ctx;
  const rows: MonthlyDocRow[] = [];
  for (const m of monthsAgo) {
    const period = cal.period(m);
    const path = docPath(resource.folder, resource.owner, type, period);
    rows.push({
      id: demoId('doc_monthly', `${applies}:${type.key}:${period}`),
      applies,
      id_document_types: demoId('doc_type', type.key),
      period,
      state: 'presentado',
      document_path: path,
      user_id: ctx.actorId,
      // Se carga los primeros dias del mes siguiente al periodo (nunca en el futuro).
      created_at: cal.at(Math.min(cal.monthRange(m - 1).from + faker.number.int({ min: 2, max: 6 }), 0), 10),
    });
    await addPdf(ctx, DOCUMENT_BUCKET, path, {
      title: `${type.name} ${period}`,
      fields: [...resource.fields, ['Período', period]],
      body,
      reference: `${resource.reference}/${type.key}/${period}`,
    });
  }
  return rows;
}

export async function seedDocuments(ctx: Ctx, employees: DemoEmployee[], vehicles: DemoVehicle[]): Promise<void> {
  const { tx, cal, faker } = ctx;
  const byType = new Map(DOC_TYPES.map((d) => [demoId('doc_type', d.key), d]));
  const typeOf = (key: string) => DOC_TYPES.find((d) => d.key === key)!;

  // ── Empleados ───────────────────────────────────────────────────────────────
  const empById = new Map(employees.map((e) => [e.id, e]));
  const empDocs = await tx.documents_employees.findMany({
    where: { archived_at: null },
    select: { id: true, applies: true, id_document_types: true },
    orderBy: [{ applies: 'asc' }, { id_document_types: 'asc' }],
  });
  const empUpdates: PendingUpdate[] = [];
  for (const doc of empDocs) {
    const emp = empById.get(doc.applies ?? '');
    const type = byType.get(doc.id_document_types ?? '');
    if (emp && type) empUpdates.push(await resolvePending(ctx, doc.id, type, employeeResource(emp)));
  }
  await applyUpdates(ctx, 'documents_employees', empUpdates);

  const empMonthly: MonthlyDocRow[] = [];
  for (const emp of employees.filter((e) => e.active && e.admission < -60)) {
    empMonthly.push(
      ...(await monthlyDocs(ctx, emp.id, employeeResource(emp), typeOf('recibo'), [1, 2], 'Recibo de haberes del período indicado, firmado en conformidad por el empleado.')),
      ...(await monthlyDocs(ctx, emp.id, employeeResource(emp), typeOf('art_nomina'), [1], 'El empleado figura en la nómina vigente de la aseguradora de riesgos del trabajo.'))
    );
  }
  await tx.documents_employees.createMany({ data: empMonthly });

  // ── Equipos ─────────────────────────────────────────────────────────────────
  const vehById = new Map(vehicles.map((v) => [v.id, v]));
  const eqDocs = await tx.documents_equipment.findMany({
    where: { archived_at: null },
    select: { id: true, applies: true, id_document_types: true },
    orderBy: [{ applies: 'asc' }, { id_document_types: 'asc' }],
  });
  const eqUpdates: PendingUpdate[] = [];
  for (const doc of eqDocs) {
    const veh = vehById.get(doc.applies ?? '');
    const type = byType.get(doc.id_document_types ?? '');
    if (veh && type) eqUpdates.push(await resolvePending(ctx, doc.id, type, vehicleResource(veh)));
  }
  await applyUpdates(ctx, 'documents_equipment', eqUpdates);

  const eqMonthly: MonthlyDocRow[] = [];
  for (const veh of vehicles.filter((v) => v.active)) {
    eqMonthly.push(...(await monthlyDocs(ctx, veh.id, vehicleResource(veh), typeOf('pago_seguro'), [1], 'Comprobante de pago de la cuota mensual de la póliza de seguro de la unidad.')));
  }
  await tx.documents_equipment.createMany({ data: eqMonthly });

  // ── Empresa ─────────────────────────────────────────────────────────────────
  const companyDocs: Array<{ id: string; applies: string; id_document_types: string; validity: string | null; state: DocState; document_path: string; period: string | null; user_id: string; created_at: Date }> = [];
  for (const type of DOC_TYPES.filter((d) => d.applies === 'Empresa')) {
    const periods = type.monthly ? [1, 2, 3].map((m) => cal.period(m)) : [null];
    for (const period of periods) {
      // ART por vencer y habilitacion vencida: la pantalla de empresa tiene alertas que mostrar.
      const expiry = type.key === 'art_empresa' ? 18 : type.key === 'habilitacion' ? -12 : type.expires ? faker.number.int({ min: 60, max: type.validityDays ?? 365 }) : null;
      const mark = period ?? (expiry !== null ? toDmy(cal.ymd(expiry), '-') : 'v0');
      const path = docPath('empresa', null, type, mark);
      companyDocs.push({
        id: demoId('doc_company', `${type.key}:${period ?? ''}`),
        applies: ctx.company.id,
        id_document_types: demoId('doc_type', type.key),
        validity: expiry === null ? null : toDmy(cal.ymd(expiry)),
        state: type.key === 'habilitacion' ? 'vencido' : 'presentado',
        document_path: path,
        period,
        user_id: ctx.actorId,
        created_at: cal.at(Math.min(expiry !== null && type.validityDays ? expiry - type.validityDays : -200, -1), 10),
      });
      await addPdf(ctx, DOCUMENT_BUCKET, path, {
        title: period ? `${type.name} ${period}` : type.name,
        fields: [
          ['Razón social', ctx.company.name],
          ['CUIT', ctx.company.cuit],
          ...(period ? ([['Período', period]] as Array<[string, string]>) : []),
          ['Vencimiento', expiry === null ? 'Sin vencimiento' : toDmy(cal.ymd(expiry))],
        ],
        body: `${type.description}.`,
        reference: `empresa/${type.key}${period ? `/${period}` : ''}`,
      });
    }
  }
  await tx.documents_company.createMany({ data: companyDocs });

  ctx.log(
    `documentos: ${empUpdates.length + empMonthly.length} de empleados, ${eqUpdates.length + eqMonthly.length} de equipos, ${companyDocs.length} de empresa (${ctx.files.length} PDFs)`
  );
}
