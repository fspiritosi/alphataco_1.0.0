/**
 * Extrae la lógica SQL vigente (funciones, triggers y vistas) de las migraciones
 * históricas y la vuelca en `prisma/sql/`:
 *
 *   - `prisma/sql/objects.json`   → inventario completo (incluye huérfanos y descartados)
 *   - `prisma/sql/<dominio>.sql`  → objetos portables, aplicables tal cual con psql
 *   - `prisma/sql/INVENTARIO.md`  → tabla por objeto con llamadores y referencias Supabase
 *
 * Orden de lectura: `docs/legacy-migrations/supabase/*.sql` (por nombre) y después
 * `docs/legacy-migrations/prisma/<timestamp>_<nombre>/migration.sql` con timestamp >= 20260313
 * (`0_baseline` es una re-serialización del esquema y no se lee). Son las migraciones
 * históricas de gh_gestion/Supabase, archivadas en la Task 4 del plan P1.
 *
 * OJO: los `.sql` de `prisma/sql/` fueron revisados A MANO en la Task 4 (sin auth/storage,
 * actor por app.user_id, filtros por empresa, huérfanas portadas para los jobs). Volver a
 * correr este script PISA esas ediciones: sólo tiene valor como referencia histórica.
 *
 * Uso: `node scripts/sql/extract-sql-objects.ts` (Node >= 22.18 ejecuta TS por
 * type stripping: sin enums, sin parameter properties, sin namespaces).
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSqlStatements } from './split-statements.ts';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SqlObjectKind = 'function' | 'trigger' | 'view';

export type SqlObject = {
  kind: SqlObjectKind;
  name: string;
  /** Sólo triggers: tabla sobre la que está definido. */
  table?: string;
  /** Sólo triggers: función que ejecuta (`EXECUTE FUNCTION ...`). */
  triggerFunction?: string;
  /** Sentencia `CREATE ...` tal como quedó en su última definición (sin `;`). */
  statement: string;
  /** Archivo de migración de donde sale la definición vigente. */
  source: string;
};

export type SqlInput = { path: string; sql: string };

type Caller = {
  kind: 'src' | 'edge' | 'trigger' | 'function' | 'view' | 'cron';
  /** Detalle: archivo:línea (src/edge), nombre del trigger/función/vista, o job de cron. */
  ref: string;
  /** Sólo src: cómo se detectó la llamada. */
  via?: 'rpc' | 'raw' | 'ref';
};

type DomainName = 'permissions' | 'documents' | 'diagrams' | 'daily-report' | 'kpis' | 'maintenance' | 'misc';

type InventoryObject = SqlObject & {
  domain: DomainName;
  callers: Caller[];
  /** Menciones en comentarios de src/ (no cuentan como llamador). */
  commentMentions: string[];
  supabaseRefs: string[];
  orphan?: true;
  discarded?: string;
};

/** Firmas distintas vigentes para un mismo nombre (sobrecarga real en Postgres). */
type OverloadWarning = { name: string; kept: string; signatures: { signature: string; source: string }[] };

type ExtractionResult = {
  objects: SqlObject[];
  overloads: OverloadWarning[];
  /** Funciones eliminadas con DROP FUNCTION y no recreadas después. */
  droppedFunctions: string[];
  cronJobs: { job: string; functions: string[]; source: string }[];
  ignoredSchemas: string[];
  warnings: string[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SUPABASE_MIGRATIONS_DIR = join(REPO_ROOT, 'docs', 'legacy-migrations', 'supabase');
const PRISMA_MIGRATIONS_DIR = join(REPO_ROOT, 'docs', 'legacy-migrations', 'prisma');
const PRISMA_MIN_TIMESTAMP = '20260313';
const SRC_DIR = join(REPO_ROOT, 'src');
const EDGE_FUNCTIONS_DIR = join(REPO_ROOT, 'supabase', 'functions');
const OUTPUT_DIR = join(REPO_ROOT, 'prisma', 'sql');

/** Tablas eliminadas en Fases 1–2: todo objeto que las mencione se descarta. */
const REMOVED_TABLES = ['checklist_answer_repairs', 'repair_solicitudes', 'repairlogs', 'hired_modules'];

const SUPABASE_REF_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'auth.uid()', re: /\bauth\.uid\s*\(\s*\)/i },
  { label: 'auth.jwt()', re: /\bauth\.jwt\s*\(\s*\)/i },
  { label: 'auth.role()', re: /\bauth\.role\s*\(\s*\)/i },
  { label: 'storage.', re: /\bstorage\./i },
  { label: 'extensions.', re: /\bextensions\./i },
  { label: 'net.http_post', re: /\bnet\.http_post\b/i },
  { label: 'cron.', re: /\bcron\./i },
  { label: 'pgsodium', re: /\bpgsodium\b/i },
  { label: 'supabase_functions', re: /\bsupabase_functions\b/i },
];

const DOMAIN_RULES: { domain: DomainName; patterns: string[] }[] = [
  { domain: 'permissions', patterns: ['permission', 'role', 'module', 'tab'] },
  { domain: 'documents', patterns: ['documento', 'document', 'alerta', 'status'] },
  { domain: 'diagrams', patterns: ['diagram', 'novelty', 'absence', 'hr_'] },
  { domain: 'daily-report', patterns: ['daily', 'preparte', 'deviation'] },
  { domain: 'kpis', patterns: ['kpi', 'indicator', 'services_summary'] },
  { domain: 'maintenance', patterns: ['maintenance', 'work_order', 'repair', 'tire', 'checklist'] },
];

const DOMAIN_ORDER: DomainName[] = ['permissions', 'documents', 'diagrams', 'daily-report', 'kpis', 'maintenance', 'misc'];

const GENERATED_HEADER = '-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4';

// ─── Regex de reconocimiento de sentencias ────────────────────────────────────

const IDENT = String.raw`(?:"?([A-Za-z_][A-Za-z0-9_]*)"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?`;

const CREATE_FUNCTION_RE = new RegExp(String.raw`^create\s+(?:or\s+replace\s+)?function\s+${IDENT}\s*\(`, 'i');
const DROP_FUNCTION_RE = new RegExp(String.raw`^drop\s+function\s+(?:if\s+exists\s+)?${IDENT}`, 'i');
const CREATE_TRIGGER_RE = new RegExp(
  String.raw`^create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+[\s\S]*?\bon\s+${IDENT}`,
  'i'
);
const TRIGGER_FUNCTION_RE = new RegExp(String.raw`\bexecute\s+(?:function|procedure)\s+${IDENT}\s*\(`, 'i');
const DROP_TRIGGER_RE = new RegExp(String.raw`^drop\s+trigger\s+(?:if\s+exists\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+on\s+${IDENT}`, 'i');
const CREATE_VIEW_RE = new RegExp(
  String.raw`^create\s+(?:or\s+replace\s+)?(?:temp\s+|temporary\s+)?(?:recursive\s+)?view\s+${IDENT}`,
  'i'
);
const DROP_VIEW_RE = /^drop\s+view\s+(?:if\s+exists\s+)?([\s\S]+)$/i;
const DROP_TABLE_RE = /^drop\s+table\s+(?:if\s+exists\s+)?([\s\S]+)$/i;
const CRON_SCHEDULE_RE = /^select\s+cron\.schedule\s*\(\s*'([^']*)'/i;
const DO_BLOCK_RE = /^do\s+/i;
const EMBEDDED_DDL_RE = /\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?(?:function|trigger|view)\b/i;

// ─── Lectura de archivos ──────────────────────────────────────────────────────

export function listMigrationFiles(): string[] {
  const supabaseFiles = readdirSync(SUPABASE_MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(SUPABASE_MIGRATIONS_DIR, name));

  const prismaFiles = readdirSync(PRISMA_MIGRATIONS_DIR)
    .filter((name) => {
      const timestamp = /^(\d+)/.exec(name)?.[1];
      if (!timestamp) return false;
      return timestamp.slice(0, 8) >= PRISMA_MIN_TIMESTAMP && statSync(join(PRISMA_MIGRATIONS_DIR, name)).isDirectory();
    })
    .sort()
    .map((name) => join(PRISMA_MIGRATIONS_DIR, name, 'migration.sql'));

  return [...supabaseFiles, ...prismaFiles];
}

function readInputs(files: string[]): SqlInput[] {
  return files.map((path) => ({ path: relative(REPO_ROOT, path), sql: readFileSync(path, 'utf8') }));
}

// ─── Helpers de parseo ────────────────────────────────────────────────────────

function normalizeName(schema: string | undefined, name: string): { schema: string; name: string } {
  return { schema: (schema ?? 'public').toLowerCase(), name: name.toLowerCase() };
}

/** Devuelve el texto entre el primer `(` y su `)` correspondiente. */
function extractParamList(statement: string): string {
  const open = statement.indexOf('(');
  if (open < 0) return '';
  let depth = 0;
  let inString = false;
  for (let i = open; i < statement.length; i += 1) {
    const ch = statement[i];
    if (inString) {
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") inString = true;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return statement.slice(open + 1, i);
    }
  }
  return statement.slice(open + 1);
}

function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Firma de la función reducida a la lista de tipos (sin nombres, modos ni defaults). */
function signatureOf(statement: string): string {
  const params = splitTopLevelCommas(extractParamList(statement)).map((param) => {
    let cleaned = param.replace(/\s+/g, ' ').trim().toLowerCase();
    cleaned = cleaned.replace(/\s+default\s+[\s\S]*$/, '').replace(/\s*=\s*[\s\S]*$/, '');
    cleaned = cleaned.replace(/^(?:in|out|inout|variadic)\s+/, '');
    const tokens = cleaned.split(' ');
    return tokens.length >= 2 ? tokens.slice(1).join(' ') : cleaned;
  });
  return params.join(', ');
}

function parseNameList(raw: string): { schema: string; name: string }[] {
  return raw
    .replace(/\b(cascade|restrict)\b\s*$/i, '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = new RegExp(`^${IDENT}$`).exec(part);
      return match ? normalizeName(match[1], match[2]) : normalizeName(undefined, part.replace(/"/g, ''));
    });
}

// ─── Extracción ───────────────────────────────────────────────────────────────

export function extractSqlObjects(files: SqlInput[]): ExtractionResult {
  const objects = new Map<string, SqlObject>();
  /** nombre → (firma → origen) de las definiciones vivas (sin DROP posterior). */
  const signatures = new Map<string, Map<string, string>>();
  const dropped = new Set<string>();
  const cronJobs: ExtractionResult['cronJobs'] = [];
  const ignoredSchemas = new Set<string>();
  const warnings: string[] = [];

  const triggerKey = (name: string, table: string) => `trigger:${name}@${table}`;

  for (const file of files) {
    for (const statement of splitSqlStatements(file.sql)) {
      let match: RegExpExecArray | null;

      if ((match = CREATE_FUNCTION_RE.exec(statement))) {
        const { schema, name } = normalizeName(match[1], match[2]);
        if (schema !== 'public') {
          ignoredSchemas.add(`${schema}.${name} (${file.path})`);
          continue;
        }
        const key = `function:${name}`;
        const alive = signatures.get(name) ?? new Map<string, string>();
        alive.set(signatureOf(statement), file.path);
        signatures.set(name, alive);
        dropped.delete(name);
        objects.set(key, { kind: 'function', name, statement, source: file.path });
        continue;
      }

      if ((match = DROP_FUNCTION_RE.exec(statement))) {
        const { schema, name } = normalizeName(match[1], match[2]);
        if (schema !== 'public') continue;
        if (objects.delete(`function:${name}`)) dropped.add(name);
        signatures.delete(name);
        continue;
      }

      if ((match = CREATE_TRIGGER_RE.exec(statement))) {
        const name = match[1].toLowerCase();
        const { schema, name: table } = normalizeName(match[2], match[3]);
        if (schema !== 'public') {
          ignoredSchemas.add(`trigger ${name} on ${schema}.${table} (${file.path})`);
          continue;
        }
        const fnMatch = TRIGGER_FUNCTION_RE.exec(statement);
        const triggerFunction = fnMatch ? normalizeName(fnMatch[1], fnMatch[2]).name : undefined;
        objects.set(triggerKey(name, table), {
          kind: 'trigger',
          name,
          table,
          triggerFunction,
          statement: statement.replace(/^create\s+or\s+replace\s+trigger/i, 'CREATE TRIGGER'),
          source: file.path,
        });
        continue;
      }

      if ((match = DROP_TRIGGER_RE.exec(statement))) {
        const name = match[1].toLowerCase();
        const { schema, name: table } = normalizeName(match[2], match[3]);
        if (schema !== 'public') continue;
        objects.delete(triggerKey(name, table));
        continue;
      }

      if ((match = CREATE_VIEW_RE.exec(statement))) {
        const { schema, name } = normalizeName(match[1], match[2]);
        if (schema !== 'public') {
          ignoredSchemas.add(`view ${schema}.${name} (${file.path})`);
          continue;
        }
        objects.set(`view:${name}`, { kind: 'view', name, statement, source: file.path });
        continue;
      }

      if ((match = DROP_VIEW_RE.exec(statement))) {
        for (const { schema, name } of parseNameList(match[1])) {
          if (schema === 'public') objects.delete(`view:${name}`);
        }
        continue;
      }

      if ((match = DROP_TABLE_RE.exec(statement))) {
        // Los triggers caen con su tabla.
        for (const { schema, name: table } of parseNameList(match[1])) {
          if (schema !== 'public') continue;
          for (const [key, object] of objects) {
            if (object.kind === 'trigger' && object.table === table) objects.delete(key);
          }
        }
        continue;
      }

      if ((match = CRON_SCHEDULE_RE.exec(statement))) {
        const called = new Set<string>();
        for (const call of statement.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi)) {
          called.add(call[1].toLowerCase());
        }
        cronJobs.push({ job: match[1], functions: [...called], source: file.path });
        continue;
      }

      if (DO_BLOCK_RE.test(statement) && EMBEDDED_DDL_RE.test(statement)) {
        warnings.push(`Bloque DO con DDL embebido (no se parsea) en ${file.path}`);
      }
    }
  }

  const overloads: OverloadWarning[] = [];
  for (const [name, alive] of signatures) {
    if (alive.size < 2) continue;
    const kept = objects.get(`function:${name}`);
    overloads.push({
      name,
      kept: kept ? signatureOf(kept.statement) : '',
      signatures: [...alive.entries()].map(([signature, source]) => ({ signature, source })),
    });
  }

  const list = [...objects.values()];
  return {
    objects: sortObjects(list),
    overloads,
    droppedFunctions: [...dropped].sort(),
    cronJobs,
    ignoredSchemas: [...ignoredSchemas].sort(),
    warnings,
  };
}

function sortObjects<T extends SqlObject>(list: T[]): T[] {
  const kindOrder: Record<SqlObjectKind, number> = { function: 0, view: 1, trigger: 2 };
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return kindOrder[a.kind] - kindOrder[b.kind];
    if (a.kind === 'trigger' && a.table !== b.table) return (a.table ?? '').localeCompare(b.table ?? '');
    return a.name.localeCompare(b.name);
  });
}

// ─── Clasificación ────────────────────────────────────────────────────────────

function domainForName(name: string): DomainName | undefined {
  for (const rule of DOMAIN_RULES) {
    if (rule.patterns.some((pattern) => name.includes(pattern))) return rule.domain;
  }
  return undefined;
}

function domainOf(object: SqlObject): DomainName {
  if (object.kind === 'trigger') {
    return domainForName(object.triggerFunction ?? '') ?? domainForName(object.table ?? '') ?? 'misc';
  }
  return domainForName(object.name) ?? 'misc';
}

function supabaseRefsOf(statement: string): string[] {
  return SUPABASE_REF_PATTERNS.filter(({ re }) => re.test(statement)).map(({ label }) => label);
}

function mentionsRemovedTable(statement: string): string | undefined {
  return REMOVED_TABLES.find((table) => new RegExp(String.raw`\b${table}\b`, 'i').test(statement));
}

// ─── Llamadores ───────────────────────────────────────────────────────────────

type SourceFile = { path: string; lines: string[] };

function walkTsFiles(dir: string, skipDirs: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      out.push(...walkTsFiles(full, skipDirs));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function loadSourceFiles(dir: string, skipDirs: string[]): SourceFile[] {
  return walkTsFiles(dir, skipDirs).map((path) => ({
    path: relative(REPO_ROOT, path),
    lines: readFileSync(path, 'utf8').split('\n'),
  }));
}

function classifyLine(line: string, name: string): Caller['via'] | 'comment' {
  const trimmed = line.trim();
  const index = line.search(new RegExp(String.raw`\b${name}\b`));
  const before = line.slice(0, index);
  if (/^(\/\/|\*|\/\*)/.test(trimmed) || before.includes('//')) return 'comment';
  if (new RegExp(String.raw`rpc\(\s*['"]${name}['"]`).test(line)) return 'rpc';
  if (new RegExp(String.raw`\b${name}\s*\(`).test(line)) return 'raw';
  return 'ref';
}

function findCodeCallers(
  files: SourceFile[],
  name: string,
  kind: 'src' | 'edge'
): { callers: Caller[]; comments: string[] } {
  const callers: Caller[] = [];
  const comments: string[] = [];
  const wordRe = new RegExp(String.raw`\b${name}\b`);
  for (const file of files) {
    file.lines.forEach((line, i) => {
      if (!wordRe.test(line)) return;
      const via = classifyLine(line, name);
      const ref = `${file.path}:${i + 1}`;
      if (via === 'comment') comments.push(ref);
      else callers.push({ kind, ref, via });
    });
  }
  return { callers, comments };
}

// ─── Salida ───────────────────────────────────────────────────────────────────

/** `EXECUTE FUNCTION nombre(` sin schema → `EXECUTE FUNCTION public.nombre(` (homogéneo con el resto). */
const UNQUALIFIED_TRIGGER_FN_RE = /\b(execute\s+(?:function|procedure))\s+(?!"?public"?\.)("?[A-Za-z_][A-Za-z0-9_]*"?)\s*\(/i;

function renderStatement(object: SqlObject): string {
  if (object.kind === 'trigger') {
    const statement = object.statement.replace(UNQUALIFIED_TRIGGER_FN_RE, '$1 public.$2(');
    return `DROP TRIGGER IF EXISTS ${object.name} ON public.${object.table};\n${statement};`;
  }
  return `${object.statement};`;
}

function renderDomainFile(domain: DomainName, objects: InventoryObject[]): string {
  const parts = [GENERATED_HEADER, `-- Dominio: ${domain} — ${objects.length} objeto(s)`, ''];
  for (const kind of ['function', 'view', 'trigger'] as SqlObjectKind[]) {
    const ofKind = objects.filter((o) => o.kind === kind);
    if (ofKind.length === 0) continue;
    parts.push(`-- ${'='.repeat(76)}`, `-- ${kind.toUpperCase()}S (${ofKind.length})`, `-- ${'='.repeat(76)}`, '');
    for (const object of ofKind) {
      const where = object.kind === 'trigger' ? ` ON ${object.table}` : '';
      parts.push(`-- ${object.kind} ${object.name}${where} (origen: ${object.source})`, renderStatement(object), '');
    }
  }
  return `${parts.join('\n').trimEnd()}\n`;
}

function callerLabel(caller: Caller): string {
  switch (caller.kind) {
    case 'src':
      return `src (${caller.via}) ${caller.ref}`;
    case 'edge':
      return `edge function (${caller.via}) ${caller.ref}`;
    case 'trigger':
      return `trigger ${caller.ref}`;
    case 'function':
      return `fn ${caller.ref}`;
    case 'view':
      return `vista ${caller.ref}`;
    case 'cron':
      return `cron (legacy) ${caller.ref}`;
  }
}

/** Resume los llamadores agrupados por tipo; los de funciones/vistas no vigentes se marcan con `†`. */
function summarizeCallers(callers: Caller[], notLive: Set<string>): string {
  if (callers.length === 0) return '—';
  const groups = new Map<string, string[]>();
  for (const caller of callers) {
    const label = callerLabel(caller);
    const [head, ...rest] = label.split(' ');
    const groupKey = caller.kind === 'src' || caller.kind === 'edge' ? `${head} ${rest[0]}` : head;
    let detail = caller.kind === 'src' || caller.kind === 'edge' ? rest.slice(1).join(' ') : rest.join(' ');
    if ((caller.kind === 'function' || caller.kind === 'view') && notLive.has(`${caller.kind}:${caller.ref}`)) detail += '†';
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), detail]);
  }
  return [...groups.entries()]
    .map(([group, details]) => {
      const unique = [...new Set(details)];
      const shown = unique.slice(0, 3).join(', ');
      const extra = unique.length > 3 ? ` (+${unique.length - 3})` : '';
      return `${group}: ${shown}${extra}`;
    })
    .join('<br>');
}

function renderInventory(objects: InventoryObject[], result: ExtractionResult, files: string[]): string {
  const ported = objects.filter((o) => !o.orphan && !o.discarded);
  const orphans = objects.filter((o) => o.orphan);
  const discarded = objects.filter((o) => o.discarded);
  const withRefs = ported.filter((o) => o.supabaseRefs.length > 0);
  const notLive = new Set(objects.filter((o) => o.orphan || o.discarded).map((o) => `${o.kind}:${o.name}`));
  const count = (list: InventoryObject[], kind: SqlObjectKind) => list.filter((o) => o.kind === kind).length;

  const lines: string[] = [
    '# Inventario de lógica SQL vigente',
    '',
    'Generado por `scripts/sql/extract-sql-objects.ts` — no editar a mano (regenerar con `node scripts/sql/extract-sql-objects.ts`).',
    '',
    `Fuentes leídas en orden cronológico: ${files.length} archivos (${files.filter((f) => f.includes('/supabase/')).length} de \`docs/legacy-migrations/supabase\`, ${files.filter((f) => f.includes('/prisma/')).length} de \`docs/legacy-migrations/prisma\` con timestamp ≥ ${PRISMA_MIN_TIMESTAMP}).`,
    '',
    '## Objetos portados (en `prisma/sql/<dominio>.sql`)',
    '',
    'Llamadores: `src (rpc|raw|ref)` = llamada desde `src/` (`rpc(\'x\')`, `x(` en SQL crudo, o el nombre como literal); `edge function` = las edge functions de Deno que P5 reemplazo por `/api/jobs/*` (el directorio `supabase/` ya no existe); `trigger`/`fn`/`vista` = otro objeto vigente; `†` = ese llamador es huérfano o descartado (no cuenta).',
    '',
    '| Nombre | Tipo | Dominio | Tabla | Llamadores | Referencias Supabase |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const object of ported) {
    lines.push(
      `| \`${object.name}\` | ${object.kind} | ${object.domain} | ${object.table ?? '—'} | ${summarizeCallers(object.callers, notLive)} | ${object.supabaseRefs.length ? `sí (${object.supabaseRefs.join(', ')})` : 'no'} |`
    );
  }

  lines.push('', '## Resumen', '');
  lines.push(`- Objetos vigentes detectados: ${objects.length} (${count(objects, 'function')} funciones, ${count(objects, 'view')} vistas, ${count(objects, 'trigger')} triggers)`);
  lines.push(`- Portados a \`prisma/sql/*.sql\`: ${ported.length} (${count(ported, 'function')} funciones, ${count(ported, 'view')} vistas, ${count(ported, 'trigger')} triggers)`);
  lines.push(`- Sin llamador (huérfanos, no se portan): ${orphans.length}`);
  lines.push(`- Descartados por tabla eliminada: ${discarded.length}`);
  lines.push(`- Con referencias Supabase (a corregir en Task 4): ${withRefs.length}`);
  lines.push('', '| Dominio | Funciones | Vistas | Triggers |', '| --- | --- | --- | --- |');
  for (const domain of DOMAIN_ORDER) {
    const ofDomain = ported.filter((o) => o.domain === domain);
    lines.push(`| ${domain} | ${count(ofDomain, 'function')} | ${count(ofDomain, 'view')} | ${count(ofDomain, 'trigger')} |`);
  }

  lines.push('', '## Sin llamador — no se portan', '');
  lines.push('Quedan sólo en `objects.json` con `orphan: true`. Sus únicos llamadores (si los hay) son otros huérfanos o descartados (`†`), que no cuentan.', '');
  lines.push('| Nombre | Tipo | Dominio | Llamadores no vigentes | Origen |', '| --- | --- | --- | --- | --- |');
  for (const object of orphans) {
    lines.push(`| \`${object.name}\` | ${object.kind} | ${object.domain} | ${summarizeCallers(object.callers, notLive)} | ${object.source} |`);
  }

  lines.push('', '## Descartados por tabla eliminada', '');
  lines.push('| Nombre | Tipo | Tabla | Motivo | Origen |', '| --- | --- | --- | --- | --- |');
  for (const object of discarded) {
    lines.push(`| \`${object.name}\` | ${object.kind} | ${object.table ?? '—'} | ${object.discarded} | ${object.source} |`);
  }

  lines.push('', '## Con referencias Supabase (para la Task 4)', '');
  lines.push('| Nombre | Tipo | Dominio | Referencias |', '| --- | --- | --- | --- |');
  for (const object of withRefs) {
    lines.push(`| \`${object.name}\` | ${object.kind} | ${object.domain} | ${object.supabaseRefs.join(', ')} |`);
  }

  if (result.overloads.length > 0) {
    lines.push('', '## Sobrecargas vigentes (revisar a mano)', '');
    lines.push('Firmas distintas creadas sin `DROP` intermedio: en Postgres coexisten; acá se conserva sólo la última definición.', '');
    lines.push('| Función | Firma conservada | Firmas vivas (origen de la última definición de cada una) |', '| --- | --- | --- |');
    for (const o of result.overloads) {
      const all = o.signatures.map((s) => `\`(${s.signature})\` ← ${s.source}`).join('<br>');
      lines.push(`| \`${o.name}\` | \`(${o.kept})\` | ${all} |`);
    }
  }

  if (result.cronJobs.length > 0) {
    lines.push('', '## Jobs de cron encontrados en migraciones (legacy)', '');
    for (const job of result.cronJobs) {
      lines.push(`- \`${job.job}\` (${job.source}) → llama: ${job.functions.map((f) => `\`${f}\``).join(', ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function buildInventory(result: ExtractionResult): InventoryObject[] {
  const srcFiles = loadSourceFiles(SRC_DIR, ['generated']);
  const edgeFiles = loadSourceFiles(EDGE_FUNCTIONS_DIR, []);
  const knownFunctions = new Set(result.objects.filter((o) => o.kind === 'function').map((o) => o.name));

  const inventory: InventoryObject[] = result.objects.map((object) => ({
    ...object,
    domain: domainOf(object),
    callers: [],
    commentMentions: [],
    supabaseRefs: supabaseRefsOf(object.statement),
  }));

  // 1. Descartes por tabla eliminada (y triggers cuya función se descarta).
  for (const object of inventory) {
    const removed = mentionsRemovedTable(object.statement);
    if (removed) object.discarded = `tabla eliminada (${removed})`;
  }
  const discardedFunctions = new Set(inventory.filter((o) => o.kind === 'function' && o.discarded).map((o) => o.name));
  for (const object of inventory) {
    if (object.kind === 'trigger' && !object.discarded && object.triggerFunction && discardedFunctions.has(object.triggerFunction)) {
      object.discarded = `función descartada (${object.triggerFunction})`;
    }
  }

  // 2. Llamadores estáticos (src, edge, cron, triggers, funciones/vistas).
  const byName = new Map<string, InventoryObject[]>();
  for (const object of inventory) byName.set(object.name, [...(byName.get(object.name) ?? []), object]);

  for (const object of inventory) {
    if (object.kind === 'trigger') continue;
    const src = findCodeCallers(srcFiles, object.name, 'src');
    const edge = findCodeCallers(edgeFiles, object.name, 'edge');
    object.callers.push(...src.callers, ...edge.callers);
    object.commentMentions.push(...src.comments, ...edge.comments);

    for (const job of result.cronJobs) {
      if (job.functions.includes(object.name)) object.callers.push({ kind: 'cron', ref: job.job });
    }
    for (const trigger of inventory) {
      if (trigger.kind === 'trigger' && !trigger.discarded && trigger.triggerFunction === object.name) {
        object.callers.push({ kind: 'trigger', ref: `${trigger.name} ON ${trigger.table}` });
      }
    }
    const callRe =
      object.kind === 'function'
        ? new RegExp(String.raw`\b${object.name}\s*\(`, 'i')
        : new RegExp(String.raw`\b${object.name}\b`, 'i');
    for (const other of inventory) {
      if (other === object || other.kind === 'trigger' || other.discarded) continue;
      const body = other.kind === 'function' ? other.statement.replace(CREATE_FUNCTION_RE, '') : other.statement;
      if (callRe.test(body)) object.callers.push({ kind: other.kind, ref: other.name });
    }
  }

  // 3. Huérfanos hasta punto fijo: un llamador que es huérfano/descartado no cuenta.
  let changed = true;
  while (changed) {
    changed = false;
    for (const object of inventory) {
      if (object.kind === 'trigger' || object.discarded || object.orphan) continue;
      const live = object.callers.filter((caller) => {
        if (caller.kind !== 'function' && caller.kind !== 'view') return true;
        return (byName.get(caller.ref) ?? []).some((o) => o.kind === caller.kind && !o.orphan && !o.discarded);
      });
      if (live.length === 0) {
        object.orphan = true;
        changed = true;
      }
    }
  }

  for (const object of inventory) {
    if (object.kind === 'trigger' && !object.discarded && object.triggerFunction && !knownFunctions.has(object.triggerFunction)) {
      result.warnings.push(`Trigger ${object.name} ON ${object.table} ejecuta ${object.triggerFunction}(), que no está definida en las migraciones`);
    }
    if (object.kind === 'trigger' || object.orphan || object.discarded) continue;
    for (const gone of result.droppedFunctions) {
      if (new RegExp(String.raw`\b${gone}\s*\(`, 'i').test(object.statement)) {
        result.warnings.push(`${object.kind} ${object.name} (portado) referencia ${gone}(), eliminada por DROP FUNCTION`);
      }
    }
  }

  return inventory;
}

function main(): void {
  const files = listMigrationFiles();
  const inputs = readInputs(files);
  const result = extractSqlObjects(inputs);
  const inventory = buildInventory(result);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const ported = inventory.filter((o) => !o.orphan && !o.discarded);
  for (const domain of DOMAIN_ORDER) {
    const ofDomain = ported.filter((o) => o.domain === domain);
    writeFileSync(join(OUTPUT_DIR, `${domain}.sql`), renderDomainFile(domain, ofDomain));
  }
  writeFileSync(join(OUTPUT_DIR, 'objects.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  writeFileSync(join(OUTPUT_DIR, 'INVENTARIO.md'), renderInventory(inventory, result, inputs.map((f) => f.path)));

  const out: string[] = [];
  out.push(`Archivos leídos: ${files.length}`);
  out.push(`Objetos vigentes: ${inventory.length}`);
  out.push(`  funciones: ${inventory.filter((o) => o.kind === 'function').length}`);
  out.push(`  triggers:  ${inventory.filter((o) => o.kind === 'trigger').length}`);
  out.push(`  vistas:    ${inventory.filter((o) => o.kind === 'view').length}`);
  out.push(`Descartados (tabla eliminada): ${inventory.filter((o) => o.discarded).length}`);
  out.push(`Huérfanos (sin llamador): ${inventory.filter((o) => o.orphan).length}`);
  out.push(`Portados: ${ported.length}`);
  out.push(`  funciones: ${ported.filter((o) => o.kind === 'function').length}`);
  out.push(`  triggers:  ${ported.filter((o) => o.kind === 'trigger').length}`);
  out.push(`  vistas:    ${ported.filter((o) => o.kind === 'view').length}`);
  out.push(`Con referencias Supabase (portados): ${ported.filter((o) => o.supabaseRefs.length > 0).length}`);
  out.push(`Sobrecargas vigentes: ${result.overloads.length}`);
  for (const o of result.overloads) {
    out.push(`  - ${o.name}: conservada (${o.kept}); vivas: ${o.signatures.map((s) => `(${s.signature})`).join(' | ')}`);
  }
  out.push(`Funciones eliminadas por DROP sin recreación: ${result.droppedFunctions.join(', ') || '—'}`);
  if (result.ignoredSchemas.length) out.push(`Ignorados por schema no public: ${result.ignoredSchemas.join('; ')}`);
  for (const w of result.warnings) out.push(`AVISO: ${w}`);
  process.stdout.write(`${out.join('\n')}\n`);
}

const isDirectRun = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
