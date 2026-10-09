/**
 * Compras (etapa 1): rubros, proveedores con contactos, condicion de pago y documentos (alguno
 * vencido o por vencer), y solicitudes de compra en todos los estados, una generada desde un
 * pedido de materiales de Almacenes. Va DESPUES de Almacenes: usa sus materiales y pedidos.
 *
 * Etapa 2: una solicitud cotizada a 3 proveedores (respondio, sin respuesta, no cotiza), una OC
 * enviada desde la cotizacion mas barata (la solicitud queda pedida en parte), una OC directa
 * pendiente de aprobacion y una OC rechazada que volvio a borrador.
 */
import type { Prisma } from '../../../src/generated/prisma/client.ts';
import { addPdf, type Ctx } from '../lib/ctx.ts';
import { toDmy } from '../lib/dates.ts';
import { demoId } from '../lib/ids.ts';

export const SUPPLIER_DOCUMENTS_BUCKET = 'supplier-documents';

const CATEGORIES = ['Repuestos', 'Cubiertas', 'Lubricantes', 'Servicios de taller', 'Ropa y EPP'] as const;

interface DemoSupplier {
  key: string;
  name: string;
  tradeName: string | null;
  /** 10 digitos: el verificador se calcula. */
  cuitPrefix: string;
  vat: number;
  city: string;
  paymentDays: number;
  categories: (typeof CATEGORIES)[number][];
  contact: { name: string; role: string };
  /** Dias hasta el vencimiento de la constancia (negativo = vencida). */
  arcaExpiry: number;
}

const SUPPLIERS: DemoSupplier[] = [
  { key: 'repuestos-sur', name: 'Repuestos del Sur SRL', tradeName: null, cuitPrefix: '3071234567', vat: 1, city: 'Neuquén', paymentDays: 30, categories: ['Repuestos'], contact: { name: 'Ana Pérez', role: 'Ventas' }, arcaExpiry: 200 },
  { key: 'neumaticos-patagonia', name: 'Neumáticos Patagonia SA', tradeName: 'NeuPat', cuitPrefix: '3070112233', vat: 1, city: 'Cipolletti', paymentDays: 45, categories: ['Cubiertas'], contact: { name: 'Carlos Ruiz', role: 'Comercial' }, arcaExpiry: 18 },
  { key: 'lubricantes-comahue', name: 'Lubricantes del Comahue SRL', tradeName: null, cuitPrefix: '3071555222', vat: 1, city: 'Plottier', paymentDays: 30, categories: ['Lubricantes'], contact: { name: 'María Gómez', role: 'Atención a empresas' }, arcaExpiry: -12 },
  { key: 'taller-andes', name: 'Taller Mecánico Los Andes', tradeName: null, cuitPrefix: '2028765432', vat: 6, city: 'Neuquén', paymentDays: 15, categories: ['Servicios de taller'], contact: { name: 'Jorge Díaz', role: 'Titular' }, arcaExpiry: 120 },
  { key: 'indumentaria-sur', name: 'Indumentaria del Sur SA', tradeName: null, cuitPrefix: '3070987654', vat: 1, city: 'Neuquén', paymentDays: 30, categories: ['Ropa y EPP'], contact: { name: 'Lucía Fernández', role: 'Ventas' }, arcaExpiry: 300 },
  { key: 'hidraulica-vaca-muerta', name: 'Hidráulica Vaca Muerta SRL', tradeName: 'HVM', cuitPrefix: '3071888999', vat: 1, city: 'Añelo', paymentDays: 60, categories: ['Repuestos', 'Servicios de taller'], contact: { name: 'Pablo Sosa', role: 'Jefe de servicio' }, arcaExpiry: 25 },
  { key: 'ferreteria-industrial', name: 'Ferretería Industrial Neuquén SA', tradeName: null, cuitPrefix: '3070333444', vat: 1, city: 'Neuquén', paymentDays: 30, categories: ['Repuestos', 'Ropa y EPP'], contact: { name: 'Sofía Herrera', role: 'Mostrador' }, arcaExpiry: 90 },
  { key: 'filtros-norte', name: 'Filtros Norte', tradeName: null, cuitPrefix: '2033445566', vat: 6, city: 'Centenario', paymentDays: 0, categories: ['Repuestos', 'Lubricantes'], contact: { name: 'Diego Molina', role: 'Titular' }, arcaExpiry: 150 },
];

/** CUIT valido a partir de 10 digitos (misma regla que `isValidCuit`). */
export function demoCuit(prefix10: string): bigint {
  const coefficients = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = coefficients.reduce((acc, c, i) => acc + c * Number(prefix10[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) throw new Error(`El prefijo ${prefix10} no tiene CUIT valido: elegi otro`);
  return BigInt(`${prefix10}${check}`);
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

export async function seedPurchases(ctx: Ctx): Promise<void> {
  const { tx, cal, company, actorId } = ctx;

  // ── Rubros y proveedores ──────────────────────────────────────────────────
  await tx.supplier_categories.createMany({
    data: CATEGORIES.map((name) => ({ id: demoId('supplier_category', name), company_id: company.id, name })),
  });

  const suppliers: Prisma.suppliersCreateManyInput[] = [];
  const contacts: Prisma.supplier_contactsCreateManyInput[] = [];
  const links: Prisma.supplier_category_linksCreateManyInput[] = [];
  const documents: Prisma.supplier_documentsCreateManyInput[] = [];
  for (const s of SUPPLIERS) {
    const id = demoId('supplier', s.key);
    suppliers.push({
      id,
      company_id: company.id,
      name: s.name,
      trade_name: s.tradeName,
      cuit: demoCuit(s.cuitPrefix),
      vat_condition_id: s.vat,
      city: s.city,
      province: 'Neuquén',
      payment_term_days: s.paymentDays,
      created_at: cal.at(-200, 9),
      updated_at: cal.at(-200, 9),
    });
    const domain = `${slug(s.tradeName ?? s.name).split('-').slice(0, 2).join('')}.test`;
    contacts.push({
      id: demoId('supplier_contact', s.key),
      supplier_id: id,
      name: s.contact.name,
      email: `${slug(s.contact.name).split('-')[0]}@${domain}`,
      phone: `299 4${String(100000 + suppliers.length * 7919).slice(-6)}`,
      role: s.contact.role,
      is_primary: true,
    });
    for (const category of s.categories) links.push({ supplier_id: id, category_id: demoId('supplier_category', category) });

    // Constancia de inscripcion de ARCA con su vencimiento (algunas vencidas o por vencer).
    const key = `${company.id}/${id}/constancia-arca.pdf`;
    documents.push({
      id: demoId('supplier_document', s.key),
      supplier_id: id,
      name: 'Constancia de inscripción ARCA',
      file_path: key,
      file_name: 'constancia-arca.pdf',
      expires_at: new Date(`${cal.ymd(s.arcaExpiry)}T00:00:00.000Z`),
      uploaded_by: actorId,
      created_at: cal.at(-60, 10),
    });
    await addPdf(ctx, SUPPLIER_DOCUMENTS_BUCKET, key, {
      title: 'Constancia de inscripción',
      fields: [
        ['Razón social', s.name],
        ['CUIT', String(demoCuit(s.cuitPrefix))],
        ['Vencimiento', toDmy(cal.ymd(s.arcaExpiry))],
      ],
      body: 'Constancia de inscripción presentada por el proveedor.',
      reference: `${s.key}/arca`,
    });
  }
  await tx.suppliers.createMany({ data: suppliers });
  await tx.supplier_contacts.createMany({ data: contacts });
  await tx.supplier_category_links.createMany({ data: links });
  await tx.supplier_documents.createMany({ data: documents });

  // ── Solicitudes de compra ─────────────────────────────────────────────────
  const materials = await tx.materials.findMany({
    where: {
      company_id: company.id,
      is_active: true,
      tracking_type: 'QUANTITY',
      clothing_combination: null,
      tire_combination: null,
    },
    select: { id: true, unit_id: true },
    orderBy: { code: 'asc' },
    take: 6,
  });
  const unit = await tx.measurement_units.findFirstOrThrow({
    where: { company_id: company.id, abbreviation: 'u' },
    select: { id: true },
  });
  if (materials.length < 3) throw new Error('La demo de Compras necesita al menos 3 materiales de Almacenes');
  const supplierId = (key: string) => demoId('supplier', key);

  type Plan = {
    key: string;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PARTIALLY_ORDERED' | 'ORDERED';
    day: number;
    notes: string;
    lines: { material?: number; description?: string; quantity: number; supplier?: string }[];
  };
  const plans: Plan[] = [
    { key: 'aprobada-lubricantes', status: 'PARTIALLY_ORDERED', day: -20, notes: 'Reposición mensual de lubricantes', lines: [{ material: 0, quantity: 200, supplier: 'lubricantes-comahue' }, { material: 1, quantity: 40 }] },
    { key: 'aprobada-servicio', status: 'ORDERED', day: -12, notes: 'Equipo fuera de servicio', lines: [{ description: 'Rectificado de tapa de cilindros', quantity: 1, supplier: 'taller-andes' }] },
    { key: 'aprobada-cubiertas', status: 'PARTIALLY_ORDERED', day: -6, notes: 'Recambio del tractor 12', lines: [{ description: 'Cubierta 295/80 R22.5', quantity: 6, supplier: 'neumaticos-patagonia' }] },
    { key: 'pendiente', status: 'PENDING_APPROVAL', day: -3, notes: 'Stock bajo en el pañol', lines: [{ material: 2, quantity: 10, supplier: 'ferreteria-industrial' }, { description: 'Juego de llaves torque 1/2"', quantity: 1 }] },
    { key: 'pendiente-hidraulica', status: 'PENDING_APPROVAL', day: -1, notes: 'Pérdida en el sistema hidráulico', lines: [{ description: 'Reparación de cilindro hidráulico', quantity: 1, supplier: 'hidraulica-vaca-muerta' }] },
    { key: 'borrador', status: 'DRAFT', day: 0, notes: 'Para el próximo mes', lines: [{ material: 1, quantity: 25 }] },
    { key: 'rechazada', status: 'REJECTED', day: -30, notes: 'Compra de herramientas', lines: [{ description: 'Amoladora angular 9"', quantity: 2, supplier: 'ferreteria-industrial' }] },
    { key: 'anulada', status: 'CANCELLED', day: -8, notes: 'Pedido duplicado', lines: [{ material: 0, quantity: 50 }] },
  ];

  const requests: Prisma.purchase_requestsCreateManyInput[] = [];
  const lines: Prisma.purchase_request_linesCreateManyInput[] = [];
  let seq = 0;
  const number = () => `SC-${String(++seq).padStart(6, '0')}`;
  for (const p of [...plans].sort((a, b) => a.day - b.day)) {
    const id = demoId('purchase_request', p.key);
    const submitted = p.status !== 'DRAFT';
    const decided = p.status !== 'DRAFT' && p.status !== 'PENDING_APPROVAL' && p.status !== 'CANCELLED';
    requests.push({
      id,
      company_id: company.id,
      number: number(),
      status: p.status,
      requested_by: actorId,
      needed_by: new Date(`${cal.ymd(p.day + 10)}T00:00:00.000Z`),
      notes: p.notes,
      submitted_at: submitted ? cal.at(p.day, 10) : null,
      decided_by: decided ? actorId : null,
      decided_at: decided ? cal.at(p.day + 1, 9) : null,
      decision_notes: p.status === 'REJECTED' ? 'Se usan las del pañol; no hace falta comprar' : null,
      cancelled_by: p.status === 'CANCELLED' ? actorId : null,
      cancelled_at: p.status === 'CANCELLED' ? cal.at(p.day, 12) : null,
      cancel_reason: p.status === 'CANCELLED' ? 'Cargada dos veces' : null,
      created_at: cal.at(p.day, 9),
      updated_at: cal.at(p.day, 12),
    });
    p.lines.forEach((l, i) => {
      const material = l.material !== undefined ? materials[l.material % materials.length]! : null;
      lines.push({
        request_id: id,
        position: i + 1,
        material_id: material?.id ?? null,
        description: material ? null : l.description!,
        quantity: l.quantity,
        unit_id: material?.unit_id ?? unit.id,
        suggested_supplier_id: l.supplier ? supplierId(l.supplier) : null,
      });
    });
  }

  // Una generada desde un pedido aprobado de Almacenes: mismo destino, materiales del pedido.
  const materialRequest = await tx.material_requests.findFirst({
    where: { company_id: company.id, status: { in: ['APPROVED', 'PARTIALLY_DELIVERED'] } },
    select: {
      id: true,
      number: true,
      destination_type: true,
      employee_id: true,
      vehicle_id: true,
      other_equipment_id: true,
      maintenance_order_id: true,
      customer_id: true,
      customer_service_id: true,
      lines: { select: { material_id: true, quantity: true, material: { select: { unit_id: true } } }, take: 2 },
    },
    orderBy: { number: 'asc' },
  });
  if (materialRequest) {
    const id = demoId('purchase_request', 'desde-pedido');
    requests.push({
      id,
      company_id: company.id,
      number: number(),
      status: 'PENDING_APPROVAL',
      requested_by: actorId,
      notes: `Faltante del pedido ${materialRequest.number}`,
      material_request_id: materialRequest.id,
      destination_type: materialRequest.destination_type,
      employee_id: materialRequest.employee_id,
      vehicle_id: materialRequest.vehicle_id,
      other_equipment_id: materialRequest.other_equipment_id,
      maintenance_order_id: materialRequest.maintenance_order_id,
      customer_id: materialRequest.customer_id,
      customer_service_id: materialRequest.customer_service_id,
      submitted_at: cal.at(-1, 15),
      created_at: cal.at(-1, 15),
      updated_at: cal.at(-1, 15),
    });
    materialRequest.lines.forEach((l, i) =>
      lines.push({
        request_id: id,
        position: i + 1,
        material_id: l.material_id,
        quantity: l.quantity,
        unit_id: l.material.unit_id,
      })
    );
  }

  await tx.purchase_requests.createMany({ data: requests });
  await tx.purchase_request_lines.createMany({ data: lines });
  const quotesAndOrders = await seedQuotesAndOrders(ctx, lines);
  ctx.log(
    `compras: ${suppliers.length} proveedores, ${requests.length} solicitudes${materialRequest ? ` (una desde ${materialRequest.number})` : ''}, ${quotesAndOrders}`
  );
}

// ── Etapa 2: cotizaciones y ordenes de compra ───────────────────────────────

/** Neto e IVA de una linea en centavos (precios de la demo con 2 decimales como mucho). */
function demoAmounts(quantity: number, unitPrice: number, vatPercent: number) {
  const net = Math.round(quantity * unitPrice * 100);
  const vat = Math.round((net * vatPercent) / 100);
  return { net, vat };
}

const cents = (value: number) => (value / 100).toFixed(2);

/** Ids de VAT_RATES de ARCA: 5 = 21 %, 4 = 10,5 %. */
const VAT_21 = { id: 5, percent: 21 };

async function seedQuotesAndOrders(ctx: Ctx, requestLines: Prisma.purchase_request_linesCreateManyInput[]): Promise<string> {
  const { tx, cal, company, actorId } = ctx;
  const supplierId = (key: string) => demoId('supplier', key);
  const lineOf = (requestKey: string, position: number) => {
    const requestId = demoId('purchase_request', requestKey);
    const line = requestLines.find((l) => l.request_id === requestId && l.position === position);
    if (!line) throw new Error(`Falta la linea ${position} de ${requestKey}`);
    return { requestId, quantity: Number(line.quantity), position };
  };
  // Los ids de linea los genera la base: se leen despues de crear las solicitudes.
  const stored = await tx.purchase_request_lines.findMany({
    where: { request: { company_id: company.id } },
    select: { id: true, request_id: true, position: true },
  });
  const lineId = (requestKey: string, position: number) => {
    const { requestId } = lineOf(requestKey, position);
    const found = stored.find((l) => l.request_id === requestId && l.position === position);
    if (!found) throw new Error(`Falta la linea ${position} de ${requestKey}`);
    return found.id;
  };

  // 1) Lubricantes cotizados a tres proveedores.
  const lubA = lineOf('aprobada-lubricantes', 1);
  const lubB = lineOf('aprobada-lubricantes', 2);
  type QuotePlan = {
    key: string;
    supplier: string;
    status: 'SENT' | 'RECEIVED' | 'DECLINED';
    prices: [number, number] | null;
    validDays?: number;
    deliveryDays?: number;
  };
  const quotePlans: QuotePlan[] = [
    { key: 'lub-comahue', supplier: 'lubricantes-comahue', status: 'RECEIVED', prices: [3850, 9200], validDays: 15, deliveryDays: 3 },
    { key: 'lub-filtros', supplier: 'filtros-norte', status: 'SENT', prices: null },
    { key: 'lub-repuestos', supplier: 'repuestos-sur', status: 'DECLINED', prices: null },
  ];
  let pc = 0;
  for (const q of quotePlans) {
    const id = demoId('purchase_quote', q.key);
    const email = await tx.supplier_contacts.findFirst({ where: { supplier_id: supplierId(q.supplier), is_primary: true }, select: { email: true } });
    await tx.purchase_quotes.create({
      data: {
        id,
        company_id: company.id,
        number: `PC-${String(++pc).padStart(6, '0')}`,
        supplier_id: supplierId(q.supplier),
        status: q.status,
        created_by: actorId,
        sent_at: cal.at(-18, 10),
        sent_to: email?.email ? [email.email] : [],
        received_at: q.status === 'SENT' ? null : new Date(`${cal.ymd(-16)}T00:00:00.000Z`),
        valid_until: q.validDays ? new Date(`${cal.ymd(-16 + q.validDays)}T00:00:00.000Z`) : null,
        delivery_days: q.deliveryDays ?? null,
        supplier_notes: q.status === 'RECEIVED' ? 'Precio por litro, puesto en base Neuquén' : null,
        created_at: cal.at(-18, 9),
        updated_at: cal.at(-16, 11),
        lines: {
          create: [lubA, lubB].map((l, i) => ({
            request_line_id: lineId('aprobada-lubricantes', l.position),
            quantity: l.quantity,
            unit_price: q.prices ? q.prices[i] : null,
            vat_rate_id: q.prices ? VAT_21.id : null,
          })),
        },
      },
    });
  }

  // 2) OC enviada desde la cotizacion mas barata, solo por la linea 1 (la solicitud queda en parte).
  const comahueLines = await tx.purchase_quote_lines.findMany({
    where: { quote_id: demoId('purchase_quote', 'lub-comahue') },
    select: { id: true, request_line_id: true },
  });
  type OrderPlan = {
    key: string;
    supplier: string;
    status: 'SENT' | 'PENDING_APPROVAL' | 'DRAFT';
    day: number;
    quoteKey?: string;
    deliveryPlace: string;
    lines: { requestKey: string; position: number; quantity: number; price: number }[];
    rejection?: string;
  };
  const orderPlans: OrderPlan[] = [
    {
      key: 'oc-lubricantes',
      supplier: 'lubricantes-comahue',
      status: 'SENT',
      day: -15,
      quoteKey: 'lub-comahue',
      deliveryPlace: 'Base Neuquén',
      lines: [{ requestKey: 'aprobada-lubricantes', position: 1, quantity: lubA.quantity, price: 3850 }],
    },
    {
      key: 'oc-rectificado',
      supplier: 'taller-andes',
      status: 'PENDING_APPROVAL',
      day: -2,
      deliveryPlace: 'Taller Los Andes',
      lines: [{ requestKey: 'aprobada-servicio', position: 1, quantity: 1, price: 480000 }],
    },
    {
      key: 'oc-cubiertas',
      supplier: 'neumaticos-patagonia',
      status: 'DRAFT',
      day: -4,
      deliveryPlace: 'Base Añelo',
      lines: [{ requestKey: 'aprobada-cubiertas', position: 1, quantity: 4, price: 615000 }],
      rejection: 'El precio está por encima del último que pagamos: pedí que lo revisen',
    },
  ];
  let oc = 0;
  for (const o of orderPlans) {
    const id = demoId('purchase_order', o.key);
    const amounts = o.lines.map((l) => demoAmounts(l.quantity, l.price, VAT_21.percent));
    const subtotal = amounts.reduce((acc, a) => acc + a.net, 0);
    const vatTotal = amounts.reduce((acc, a) => acc + a.vat, 0);
    const approved = o.status === 'SENT';
    const email = await tx.supplier_contacts.findFirst({ where: { supplier_id: supplierId(o.supplier), is_primary: true }, select: { email: true } });
    const paymentTerm = await tx.suppliers.findUniqueOrThrow({ where: { id: supplierId(o.supplier) }, select: { payment_term_days: true } });
    await tx.purchase_orders.create({
      data: {
        id,
        company_id: company.id,
        number: `OC-${String(++oc).padStart(6, '0')}`,
        supplier_id: supplierId(o.supplier),
        quote_id: o.quoteKey ? demoId('purchase_quote', o.quoteKey) : null,
        status: o.status,
        created_by: actorId,
        delivery_date: new Date(`${cal.ymd(o.day + 7)}T00:00:00.000Z`),
        delivery_place: o.deliveryPlace,
        payment_term_days: paymentTerm.payment_term_days,
        subtotal: cents(subtotal),
        vat_total: cents(vatTotal),
        total: cents(subtotal + vatTotal),
        submitted_at: o.status === 'DRAFT' && !o.rejection ? null : cal.at(o.day, 11),
        approved_by: approved ? actorId : null,
        approved_at: approved ? cal.at(o.day, 15) : null,
        sent_at: approved ? cal.at(o.day + 1, 9) : null,
        sent_by: approved ? actorId : null,
        sent_to: approved && email?.email ? [email.email] : [],
        rejection_notes: o.rejection ?? null,
        rejected_by: o.rejection ? actorId : null,
        rejected_at: o.rejection ? cal.at(o.day + 1, 10) : null,
        created_at: cal.at(o.day, 10),
        updated_at: cal.at(o.day + 1, 10),
        lines: {
          create: o.lines.map((l, i) => {
            const requestLineId = lineId(l.requestKey, l.position);
            return {
              position: i + 1,
              request_line_id: requestLineId,
              quote_line_id: o.quoteKey ? (comahueLines.find((q) => q.request_line_id === requestLineId)?.id ?? null) : null,
              quantity: l.quantity,
              unit_price: l.price,
              vat_rate_id: VAT_21.id,
              net_total: cents(amounts[i].net),
              vat_amount: cents(amounts[i].vat),
            };
          }),
        },
        ...(o.rejection
          ? { rejections: { create: [{ rejected_by: actorId, rejected_at: cal.at(o.day + 1, 10), reason: o.rejection }] } }
          : {}),
      },
    });
  }

  return `${quotePlans.length} pedidos de cotización y ${orderPlans.length} órdenes de compra`;
}
