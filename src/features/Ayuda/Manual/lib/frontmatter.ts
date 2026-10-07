import { z } from 'zod';

/**
 * Frontmatter de una guía: SOLO lo editorial. La estructura (permisos, pantallas, relaciones)
 * vive en el catálogo; repetirla acá sería la segunda fuente que termina divergiendo.
 *
 * Formato plano `clave: valor`, una por línea; `keywords` separadas por coma.
 */
const frontmatterSchema = z.object({
  title: z.string().min(1, 'falta `title`'),
  summary: z.string().min(1, 'falta `summary`'),
  keywords: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    ),
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '`updated` tiene que ser AAAA-MM-DD')
    .optional(),
});

export type GuideFrontmatter = z.infer<typeof frontmatterSchema>;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type ParsedGuideFile =
  | { ok: true; frontmatter: GuideFrontmatter; body: string }
  | { ok: false; error: string };

export function parseGuideFile(raw: string): ParsedGuideFile {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return { ok: false, error: 'no tiene frontmatter (bloque --- al inicio)' };

  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    fields[line.slice(0, idx).trim()] = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }

  const parsed = frontmatterSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  return { ok: true, frontmatter: parsed.data, body: raw.slice(match[0].length) };
}
