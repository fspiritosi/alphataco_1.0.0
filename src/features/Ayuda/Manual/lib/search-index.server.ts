import 'server-only';
import type { LoadedGuide } from './manual-loader';
import { normalize } from './mdx-scan';

/**
 * Búsqueda en el texto completo de las guías. El índice vive en el servidor: al navegador sólo
 * llegan los resultados (título, sección y un fragmento), nunca el cuerpo de las guías y menos el
 * de las que el usuario no puede ver.
 */

const WEIGHTS = { title: 10, keywords: 6, heading: 5, summary: 3, body: 1 } as const;
const BODY_HITS_CAP = 5;
const SNIPPET_RADIUS = 80;
const MAX_RESULTS = 12;

export type SearchSnippetPart = { text: string; match: boolean };

export type ManualSearchResult = {
  slug: string;
  title: string;
  sectionTitle: string;
  /** Título de la parte de la guía donde está la coincidencia, para saltar directo ahí. */
  headingId?: string;
  heading?: string;
  snippet: SearchSnippetPart[];
};

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = haystack.indexOf(needle);
  while (from !== -1) {
    count++;
    from = haystack.indexOf(needle, from + needle.length);
  }
  return count;
}

/** Fragmento alrededor de la primera coincidencia, partido para resaltar sin tocar HTML. */
function buildSnippet(text: string, terms: string[]): SearchSnippetPart[] {
  const normalized = normalize(text);
  const first = Math.min(...terms.map((t) => normalized.indexOf(t)).filter((i) => i >= 0));
  if (!Number.isFinite(first)) return [{ text: text.slice(0, SNIPPET_RADIUS * 2), match: false }];

  const start = Math.max(0, first - SNIPPET_RADIUS);
  const end = Math.min(text.length, first + SNIPPET_RADIUS);
  const slice = text.slice(start, end);
  const normalizedSlice = normalized.slice(start, end);

  // Marcas de coincidencia sobre el texto normalizado (mismo largo que el original: NFD + quitar
  // diacríticos conserva posiciones para el español, que no tiene letras compuestas de dos).
  const marks = new Array<boolean>(slice.length).fill(false);
  for (const term of terms) {
    let at = normalizedSlice.indexOf(term);
    while (at !== -1) {
      for (let i = at; i < at + term.length; i++) marks[i] = true;
      at = normalizedSlice.indexOf(term, at + term.length);
    }
  }

  const parts: SearchSnippetPart[] = [];
  for (let i = 0; i < slice.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.match === marks[i]) last.text += slice[i];
    else parts.push({ text: slice[i], match: marks[i] });
  }
  if (start > 0) parts.unshift({ text: '…', match: false });
  if (end < text.length) parts.push({ text: '…', match: false });
  return parts;
}

export function searchGuides(guides: LoadedGuide[], query: string): ManualSearchResult[] {
  const terms = [...new Set(normalize(query).split(/\s+/).filter((t) => t.length >= 2))];
  if (terms.length === 0) return [];

  const scored: { result: ManualSearchResult; score: number }[] = [];

  for (const guide of guides) {
    const title = normalize(guide.frontmatter.title);
    const summary = normalize(guide.frontmatter.summary);
    const keywords = normalize(guide.frontmatter.keywords.join(' '));
    const sections = guide.scan.sections.map((s) => ({
      ...s,
      normHeading: normalize(s.heading ?? ''),
      normText: normalize(s.text),
    }));

    let score = 0;
    let allFound = true;
    for (const term of terms) {
      let termScore = 0;
      if (title.includes(term)) termScore += WEIGHTS.title;
      if (keywords.includes(term)) termScore += WEIGHTS.keywords;
      if (summary.includes(term)) termScore += WEIGHTS.summary;
      for (const s of sections) {
        if (s.normHeading.includes(term)) termScore += WEIGHTS.heading;
        termScore += Math.min(BODY_HITS_CAP, countOccurrences(s.normText, term)) * WEIGHTS.body;
      }
      if (termScore === 0) {
        allFound = false;
        break;
      }
      score += termScore;
    }
    if (!allFound) continue;

    // La parte de la guía donde aparecen más términos es la que se muestra y a la que se salta.
    const best = sections
      .map((s) => ({ s, hits: terms.filter((t) => s.normText.includes(t) || s.normHeading.includes(t)).length }))
      .sort((a, b) => b.hits - a.hits)[0];
    const snippetSource = best && best.hits > 0 ? best.s.text : guide.frontmatter.summary;

    scored.push({
      score,
      result: {
        slug: guide.slug,
        title: guide.frontmatter.title,
        sectionTitle: guide.sectionTitle,
        headingId: best && best.hits > 0 ? best.s.headingId : undefined,
        heading: best && best.hits > 0 ? best.s.heading : undefined,
        snippet: buildSnippet(snippetSource, terms),
      },
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.result);
}
