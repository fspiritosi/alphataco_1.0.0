import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { GuideDef, SectionDef } from '../catalog/types.ts';
import { parseGuideFile, type GuideFrontmatter } from './frontmatter.ts';
import { scanBody, type ScannedBody } from './mdx-scan.ts';

/**
 * Lectura del contenido del manual desde disco. Sin `server-only` ni `@/`: la usan el servidor de
 * Next y `scripts/check-manual.ts`.
 */

export const MANUAL_CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'manual');

/** ~200 palabras por minuto, redondeado hacia arriba y nunca menos de 1. */
const WORDS_PER_MINUTE = 200;

export type LoadedGuide = GuideDef & {
  sectionKey: string;
  sectionTitle: string;
  frontmatter: GuideFrontmatter;
  body: string;
  scan: ScannedBody;
  minutes: number;
};

export type LoadIssue = { file: string; message: string };

export type LoadedManual = {
  guides: LoadedGuide[];
  bySlug: Map<string, LoadedGuide>;
  /** Archivos `.mdx` encontrados en disco, relativos al directorio del manual (`seccion/slug.mdx`). */
  filesOnDisk: string[];
  issues: LoadIssue[];
};

export function guideFile(sectionKey: string, slug: string): string {
  return `${sectionKey}/${slug}.mdx`;
}

function listMdxFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of readdirSync(path.join(root, entry.name), { withFileTypes: true })) {
      if (file.isFile() && file.name.endsWith('.mdx')) out.push(`${entry.name}/${file.name}`);
    }
  }
  return out.sort();
}

/** Las guías quedan en orden de lectura: sección del catálogo y, dentro, el orden del array. */
export function loadManual(sections: SectionDef[], root: string = MANUAL_CONTENT_DIR): LoadedManual {
  const issues: LoadIssue[] = [];
  const guides: LoadedGuide[] = [];

  for (const section of sections) {
    for (const def of section.guides) {
      const file = guideFile(section.key, def.slug);
      const absolute = path.join(root, file);
      if (!existsSync(absolute)) {
        issues.push({ file, message: 'la guía está en el catálogo pero no tiene archivo' });
        continue;
      }
      const parsed = parseGuideFile(readFileSync(absolute, 'utf8'));
      if (!parsed.ok) {
        issues.push({ file, message: `frontmatter inválido: ${parsed.error}` });
        continue;
      }
      const scan = scanBody(parsed.body);
      guides.push({
        ...def,
        sectionKey: section.key,
        sectionTitle: section.title,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        scan,
        minutes: Math.max(1, Math.ceil(scan.words / WORDS_PER_MINUTE)),
      });
    }
  }

  return {
    guides,
    bySlug: new Map(guides.map((g) => [g.slug, g])),
    filesOnDisk: listMdxFiles(root),
    issues,
  };
}
