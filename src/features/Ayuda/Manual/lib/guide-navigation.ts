import type { SectionDef } from '../catalog/types';
import type { LoadedGuide } from './manual-loader';

/** Datos livianos de una guía para listas, índice y búsqueda en el cliente. */
export type GuideSummary = {
  slug: string;
  title: string;
  summary: string;
  sectionKey: string;
  sectionTitle: string;
};

export function toSummary(guide: LoadedGuide): GuideSummary {
  return {
    slug: guide.slug,
    title: guide.frontmatter.title,
    summary: guide.frontmatter.summary,
    sectionKey: guide.sectionKey,
    sectionTitle: guide.sectionTitle,
  };
}

/** Árbol del índice: sólo secciones con al menos una guía visible. */
export function buildTree(sections: SectionDef[], visible: LoadedGuide[]) {
  return sections
    .map((section) => ({
      key: section.key,
      title: section.title,
      description: section.description,
      icon: section.icon,
      guides: visible.filter((g) => g.sectionKey === section.key).map(toSummary),
    }))
    .filter((section) => section.guides.length > 0);
}

export type ManualTree = ReturnType<typeof buildTree>;

/**
 * Anterior/siguiente dentro de las guías que el usuario puede abrir. `visible` ya viene en orden
 * de lectura (`loadManual` lo arma así y el filtro por permisos lo conserva).
 */
export function neighbors(visible: LoadedGuide[], slug: string) {
  const index = visible.findIndex((g) => g.slug === slug);
  return {
    previous: index > 0 ? toSummary(visible[index - 1]) : null,
    next: index >= 0 && index < visible.length - 1 ? toSummary(visible[index + 1]) : null,
  };
}

/**
 * "Ver también": las relacionadas declaradas más las guías que mencionan a esta (`<GuideLink>`),
 * sin repetir y sólo las visibles.
 */
export function relatedGuides(visible: LoadedGuide[], guide: LoadedGuide): GuideSummary[] {
  const visibleBySlug = new Map(visible.map((g) => [g.slug, g]));
  const slugs = new Set<string>(guide.related ?? []);
  for (const other of visible) {
    if (other.slug !== guide.slug && other.scan.guideLinks.some((l) => l.slug === guide.slug)) slugs.add(other.slug);
  }
  slugs.delete(guide.slug);
  return [...slugs].flatMap((slug) => {
    const found = visibleBySlug.get(slug);
    return found ? [toSummary(found)] : [];
  });
}
